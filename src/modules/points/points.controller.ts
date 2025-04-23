import { Controller, Get, Post, Param, UseGuards, Query } from '@nestjs/common';
import { PointsService } from './points.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { ActivityType } from '../../entities/user-activity.entity';

@Controller('points')
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('my')
  async getMyPoints(@CurrentUser() user: User) {
    return this.pointsService.getUserPoints(user.id);
  }

  @Get('my/badges')
  async getMyBadges(@CurrentUser() user: User) {
    return this.pointsService.getUserBadges(user.id);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'weekly',
  ) {
    return this.pointsService.getLeaderboard(period);
  }

  @Post('activity/:type')
  async recordActivity(
    @CurrentUser() user: User,
    @Param('type') activityType: ActivityType,
    @Query('referenceId') referenceId?: number,
  ) {
    return this.pointsService.recordActivity(
      user.id,
      activityType,
      referenceId,
    );
  }
}
