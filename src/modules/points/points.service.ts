import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { UserActivity } from '../../entities/user-activity.entity';
import { UserLevel } from '../../entities/user-level.entity';
import { UserBadge } from '../../entities/user-badge.entity';
import { Badge } from '../../entities/badge.entity';
import { User } from '../../entities/user.entity';
import { ActivityType } from '../../entities/user-activity.entity';
import {
  RANK_POINTS,
  RANK_CATEGORIES,
  RANK_DEMOTION,
  RANK_ORDER,
  Rank,
  RankCategory,
} from '../../common/constants/rank.constants';
import { ACTIVITY_POINTS } from 'src/common/constants/points.constants';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(UserActivity)
    private activityRepository: Repository<UserActivity>,
    @InjectRepository(UserLevel)
    private userLevelRepository: Repository<UserLevel>,
    @InjectRepository(UserBadge)
    private userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(Badge)
    private badgeRepository: Repository<Badge>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async recordActivity(
    userId: number,
    activityType: ActivityType,
    referenceId?: number,
  ) {
    const points = ACTIVITY_POINTS[activityType];

    // 활동 기록
    const activity = this.activityRepository.create({
      user: { id: userId },
      activityType,
      points,
      referenceId,
      description: `${activityType} 활동으로 ${points}점 획득`,
    });
    await this.activityRepository.save(activity);

    // 포인트 업데이트 및 계급 체크
    await this.updateUserPoints(userId, points);

    // 배지 체크
    await this.checkBadges(userId, activityType);

    return activity;
  }

  async recordActivityWithManager(
    manager: EntityManager,
    userId: number,
    activityType: ActivityType,
    referenceId?: number,
  ) {
    const points = ACTIVITY_POINTS[activityType];

    // 활동 기록
    const activity = manager.create(UserActivity, {
      user: { id: userId },
      activityType,
      points,
      referenceId,
      description: `${activityType} 활동으로 ${points}점 획득`,
    });
    await manager.save(UserActivity, activity);

    // 포인트 업데이트 및 계급 체크
    await this.updateUserPointsWithManager(manager, userId, points);

    // 배지 체크
    await this.checkBadgesWithManager(manager, userId, activityType);

    return activity;
  }

  private async updateUserPoints(userId: number, points: number) {
    let userLevel = await this.userLevelRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!userLevel) {
      userLevel = this.userLevelRepository.create({
        user: { id: userId },
        rank: Rank.PRIVATE_SECOND_CLASS,
        rankCategory: RankCategory.SOLDIER,
        activityPoints: 0,
        purchasePoints: 0,
        lastActivityAt: new Date(),
        lastPointsReductionAt: new Date(),
        rankHistory: [],
      });
    }

    // 마지막 활동 시간 업데이트
    userLevel.lastActivityAt = new Date();

    // 활동 포인트 업데이트
    userLevel.activityPoints += points;

    // 계급 체크 (활동 포인트 기준)
    await this.checkRank(userLevel);

    await this.userLevelRepository.save(userLevel);
  }

  private async updateUserPointsWithManager(
    manager: EntityManager,
    userId: number,
    points: number,
  ) {
    let userLevel = await manager.findOne(UserLevel, {
      where: { user: { id: userId } },
    });

    if (!userLevel) {
      userLevel = manager.create(UserLevel, {
        user: { id: userId },
        rank: Rank.PRIVATE_SECOND_CLASS,
        rankCategory: RankCategory.SOLDIER,
        activityPoints: 0,
        purchasePoints: 0,
        lastActivityAt: new Date(),
        lastPointsReductionAt: new Date(),
        rankHistory: [],
      });
    }

    userLevel.lastActivityAt = new Date();
    userLevel.activityPoints += points;
    await this.checkRank(userLevel);
    await manager.save(UserLevel, userLevel);
  }

  private async checkRank(userLevel: UserLevel) {
    const currentRank = userLevel.rank;
    const currentPoints = userLevel.activityPoints;

    // 현재 포인트에 맞는 계급 찾기
    let newRank = currentRank;
    for (const [rank, requiredPoints] of Object.entries(RANK_POINTS)) {
      if (currentPoints >= requiredPoints) {
        newRank = rank as Rank;
      } else {
        break;
      }
    }

    // 계급이 변경된 경우
    if (newRank !== currentRank) {
      // 계급 카테고리 업데이트
      let newCategory = userLevel.rankCategory;
      for (const [category, ranks] of Object.entries(RANK_CATEGORIES)) {
        if (ranks.includes(newRank)) {
          newCategory = category as RankCategory;
          break;
        }
      }

      // 계급 이력 추가
      userLevel.rankHistory = userLevel.rankHistory || [];
      userLevel.rankHistory.push({
        rank: newRank,
        date: new Date(),
        reason: '포인트 획득으로 인한 계급 상승',
      });

      userLevel.rank = newRank;
      userLevel.rankCategory = newCategory;
    }
  }

  async checkInactivity() {
    const inactiveUsers = await this.userLevelRepository
      .createQueryBuilder('userLevel')
      .where('userLevel.lastActivityAt < :date', {
        date: new Date(
          Date.now() - RANK_DEMOTION.INACTIVITY_PERIOD * 24 * 60 * 60 * 1000,
        ),
      })
      .getMany();

    for (const userLevel of inactiveUsers) {
      const lastReduction =
        userLevel.lastPointsReductionAt || userLevel.lastActivityAt;
      const daysSinceLastReduction = Math.floor(
        (Date.now() - lastReduction.getTime()) / (24 * 60 * 60 * 1000),
      );

      // 30일이 지났는지 확인
      if (daysSinceLastReduction >= RANK_DEMOTION.INACTIVITY_PERIOD) {
        const reductionCount = Math.floor(
          daysSinceLastReduction / RANK_DEMOTION.INACTIVITY_PERIOD,
        );
        const pointsToDeduct =
          reductionCount * RANK_DEMOTION.POINTS_REDUCTION_AMOUNT;

        userLevel.activityPoints = Math.max(
          RANK_DEMOTION.MINIMUM_POINTS,
          userLevel.activityPoints - pointsToDeduct,
        );

        // 마지막 포인트 감소일 업데이트
        userLevel.lastPointsReductionAt = new Date();

        // 계급 체크
        await this.checkRank(userLevel);

        // 계급 이력 추가
        userLevel.rankHistory.push({
          rank: userLevel.rank,
          date: new Date(),
          reason: '활동 부족으로 인한 계급 조정',
        });

        await this.userLevelRepository.save(userLevel);
      }
    }
  }

  private async checkBadges(userId: number, activityType: ActivityType) {
    const userActivities = await this.activityRepository.find({
      where: { user: { id: userId }, activityType },
    });

    const activityCount = userActivities.length;
    const userLevel = await this.userLevelRepository.findOne({
      where: { user: { id: userId } },
    });

    // 해당 활동과 관련된 배지들 조회 (QueryBuilder로 JSONB 내부 값 비교)
    const potentialBadges = await this.badgeRepository
      .createQueryBuilder('badge')
      .where(`badge.requirements->>'activityType' = :activityType`, {
        activityType,
      })
      .getMany();

    for (const badge of potentialBadges) {
      const requirements = badge.requirements;
      const hasBadge = await this.userBadgeRepository.findOne({
        where: {
          user: { id: userId },
          badge: { id: badge.id },
        },
      });

      if (!hasBadge) {
        if (
          (requirements.count && activityCount >= requirements.count) ||
          (requirements.level &&
            RANK_ORDER[userLevel.rank] >= requirements.level) ||
          (requirements.points &&
            userLevel.activityPoints >= requirements.points)
        ) {
          // 배지 획득
          const userBadge = this.userBadgeRepository.create({
            user: { id: userId },
            badge: { id: badge.id },
            earnedAt: new Date(),
            progress: {
              current: activityCount,
              target: requirements.count || 0,
            },
          });
          await this.userBadgeRepository.save(userBadge);
        }
      }
    }
  }

  private async checkBadgesWithManager(
    manager: EntityManager,
    userId: number,
    activityType: ActivityType,
  ) {
    const userActivities = await manager.find(UserActivity, {
      where: { user: { id: userId }, activityType },
    });

    const activityCount = userActivities.length;
    const userLevel = await manager.findOne(UserLevel, {
      where: { user: { id: userId } },
    });

    const potentialBadges = await manager
      .createQueryBuilder(Badge, 'badge')
      .where(`badge.requirements->>'activityType' = :activityType`, {
        activityType,
      })
      .getMany();

    for (const badge of potentialBadges) {
      const requirements = badge.requirements;
      const hasBadge = await manager.findOne(UserBadge, {
        where: {
          user: { id: userId },
          badge: { id: badge.id },
        },
      });

      if (!hasBadge) {
        if (
          (requirements.count && activityCount >= requirements.count) ||
          (requirements.level &&
            RANK_ORDER[userLevel.rank] >= requirements.level) ||
          (requirements.points &&
            userLevel.activityPoints >= requirements.points)
        ) {
          const userBadge = manager.create(UserBadge, {
            user: { id: userId },
            badge: { id: badge.id },
            earnedAt: new Date(),
            progress: {
              current: activityCount,
              target: requirements.count || 0,
            },
          });
          await manager.save(UserBadge, userBadge);
        }
      }
    }
  }

  async getUserPoints(userId: number) {
    let userLevel = await this.userLevelRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!userLevel) {
      userLevel = this.userLevelRepository.create({
        user: { id: userId },
        rank: Rank.PRIVATE_SECOND_CLASS,
        rankCategory: RankCategory.SOLDIER,
        activityPoints: 0,
        purchasePoints: 0,
        lastActivityAt: new Date(),
        lastPointsReductionAt: new Date(),
        rankHistory: [],
      });
      await this.userLevelRepository.save(userLevel);
    }

    return {
      rank: userLevel.rank,
      rankCategory: userLevel.rankCategory,
      activityPoints: userLevel.activityPoints,
      purchasePoints: userLevel.purchasePoints,
      lastActivityAt: userLevel.lastActivityAt,
      lastPointsReductionAt: userLevel.lastPointsReductionAt,
      rankHistory: userLevel.rankHistory,
    };
  }

  async getUserBadges(userId: number) {
    const userBadges = await this.userBadgeRepository.find({
      where: { user: { id: userId } },
      relations: ['badge'],
    });

    return userBadges.map((badge) => ({
      id: badge.badge.id,
      name: badge.badge.name,
      description: badge.badge.description,
      imageUrl: badge.badge.imageUrl,
      earnedAt: badge.earnedAt,
      progress: badge.progress,
    }));
  }

  async getLeaderboard(period: 'daily' | 'weekly' | 'monthly' = 'weekly') {
    const startDate = new Date();
    switch (period) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const leaderboard = await this.activityRepository
      .createQueryBuilder('activity')
      .select('activity.userId', 'userId')
      .addSelect('SUM(activity.points)', 'totalPoints')
      .addSelect('COUNT(activity.id)', 'activityCount')
      .where('activity.createdAt >= :startDate', { startDate })
      .groupBy('activity.userId')
      .orderBy('totalPoints', 'DESC')
      .limit(10)
      .getRawMany();

    // 사용자 정보 조회
    const userIds = leaderboard.map((item) => item.userId);
    const users = await this.userRepository.findByIds(userIds);

    return leaderboard.map((item) => ({
      user: users.find((u) => u.id === item.userId),
      totalPoints: Number(item.totalPoints),
      activityCount: Number(item.activityCount),
    }));
  }

  // 구매 포인트 관련 메서드 추가
  async addPurchasePoints(userId: number, points: number) {
    const userLevel = await this.userLevelRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!userLevel) {
      throw new Error('User level not found');
    }

    userLevel.purchasePoints += points;
    await this.userLevelRepository.save(userLevel);
  }

  async usePurchasePoints(userId: number, points: number) {
    const userLevel = await this.userLevelRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!userLevel) {
      throw new Error('User level not found');
    }

    if (userLevel.purchasePoints < points) {
      throw new Error('Not enough purchase points');
    }

    userLevel.purchasePoints -= points;
    await this.userLevelRepository.save(userLevel);
  }
}
