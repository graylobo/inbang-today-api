import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CrewBroadcast } from '../../entities/crew-broadcast.entity';

@Injectable()
export class CrewBroadcastService {
  constructor(
    @InjectRepository(CrewBroadcast)
    private crewBroadcastRepository: Repository<CrewBroadcast>,
  ) {}

  async create(broadcastData: any): Promise<CrewBroadcast> {
    const broadcast = this.crewBroadcastRepository.create({
      crew: { id: broadcastData.crewId },
      totalAmount: broadcastData.totalAmount,
      broadcastDate: broadcastData.broadcastDate,
      description: broadcastData.description,
      submittedBy: { id: broadcastData.submittedById },
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
