import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CrewBroadcast } from '../../entities/crew-broadcast.entity';
import { ErrorCode } from 'src/common/enums/error-codes.enum';
import { PointsService } from '../points/points.service';
import {
  ActivityType,
  UserActivity,
} from '../../entities/user-activity.entity';
import { ACTIVITY_POINTS } from '../../common/constants/points.constants';

@Injectable()
export class CrewBroadcastService {
  constructor(
    @InjectRepository(CrewBroadcast)
    private crewBroadcastRepository: Repository<CrewBroadcast>,
    private pointsService: PointsService,
  ) {}

  async create(
    broadcastData: any,
  ): Promise<
    CrewBroadcast & { pointsAwarded: number; activity: UserActivity }
  > {
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

    // Save the broadcast data
    const savedBroadcast = await this.crewBroadcastRepository.save(broadcast);

    // Award points to the user who submitted the broadcast data
    const activity = await this.pointsService.recordActivity(
      broadcastData.submittedById,
      ActivityType.BROADCAST_EARNING,
      savedBroadcast.id,
    );

    // Return both the broadcast data and point information
    return {
      ...savedBroadcast,
      pointsAwarded: ACTIVITY_POINTS[ActivityType.BROADCAST_EARNING],
      activity: activity,
    };
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
