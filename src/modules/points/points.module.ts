import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsService } from './points.service';
import { UserActivity } from '../../entities/user-activity.entity';
import { UserLevel } from '../../entities/user-level.entity';
import { UserBadge } from '../../entities/user-badge.entity';
import { Badge } from '../../entities/badge.entity';
import { User } from '../../entities/user.entity';
import { PointsController } from 'src/modules/points/points.controller';
import { PurchasePointHistory } from 'src/entities/purchase-point-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserActivity,
      UserLevel,
      UserBadge,
      Badge,
      User,
      PurchasePointHistory,
    ]),
  ],
  providers: [PointsService],
  controllers: [PointsController],
  exports: [PointsService],
})
export class PointsModule {}
