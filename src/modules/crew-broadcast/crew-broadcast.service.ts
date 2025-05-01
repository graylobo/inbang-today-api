import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CrewBroadcast } from '../../entities/crew-broadcast.entity';
import { ErrorCode } from 'src/common/enums/error-codes.enum';

@Injectable()
export class CrewBroadcastService {
  constructor(
    @InjectRepository(CrewBroadcast)
    private crewBroadcastRepository: Repository<CrewBroadcast>,
  ) {}

  async create(broadcastData: any): Promise<CrewBroadcast> {
    // Check if a broadcast with the same crew and date already exists
    const existingBroadcast = await this.crewBroadcastRepository.findOne({
      where: {
        crew: { id: broadcastData.crewId },
        broadcastDate: broadcastData.broadcastDate,
      },
    });

    if (existingBroadcast) {
      throw new BadRequestException(ErrorCode.DUPLICATE_BROADCAST_DATE);
    }

    const broadcast = this.crewBroadcastRepository.create({
      crew: { id: broadcastData.crewId },
      totalAmount: broadcastData.totalAmount,
      broadcastDate: broadcastData.broadcastDate,
      description: broadcastData.description,
      submittedBy: { id: broadcastData.submittedById },
      broadcastDuration: broadcastData.broadcastDuration,
    });
    return this.crewBroadcastRepository.save(broadcast);
  }

  async findByCrewAndDateRange(
    crewId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<CrewBroadcast[]> {
    return this.crewBroadcastRepository.find({
      where: {
        crew: { id: crewId },
        broadcastDate: Between(startDate, endDate),
      },
      relations: ['crew', 'submittedBy'],
      order: { broadcastDate: 'DESC' },
    });
  }
}
