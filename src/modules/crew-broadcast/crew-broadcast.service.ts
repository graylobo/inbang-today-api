import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
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
    private dataSource: DataSource,
  ) {}

  async create(
    broadcastData: any,
  ): Promise<
    CrewBroadcast & { pointsAwarded: number; activity: UserActivity }
  > {
    return await this.dataSource.transaction(async (manager) => {
      // Check if a broadcast with the same crew and date already exists
      const existingBroadcast = await manager.findOne(CrewBroadcast, {
        where: {
          crew: { id: broadcastData.crewId },
          broadcastDate: broadcastData.broadcastDate,
        },
      });

      if (existingBroadcast) {
        throw new BadRequestException(ErrorCode.DUPLICATE_BROADCAST_DATE);
      }

      const broadcast = manager.create(CrewBroadcast, {
        crew: { id: broadcastData.crewId },
        totalAmount: broadcastData.totalAmount,
        broadcastDate: broadcastData.broadcastDate,
        description: broadcastData.description,
        submittedBy: { id: broadcastData.submittedById },
        broadcastDuration: broadcastData.broadcastDuration,
      });

      // Save the broadcast data
      const savedBroadcast = await manager.save(CrewBroadcast, broadcast);

      // Award activity points to the user who submitted the broadcast data
      const activity = await this.pointsService.recordActivityWithManager(
        manager,
        broadcastData.submittedById,
        ActivityType.BROADCAST_EARNING,
        savedBroadcast.id,
      );

      // Also award purchase points (with manager)
      await this.pointsService.addPurchasePointsWithManager(
        manager,
        broadcastData.submittedById,
        ACTIVITY_POINTS[ActivityType.BROADCAST_EARNING],
      );

      // Return both the broadcast data and point information
      return {
        ...savedBroadcast,
        pointsAwarded: ACTIVITY_POINTS[ActivityType.BROADCAST_EARNING],
        activity: activity,
      };
    });
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
