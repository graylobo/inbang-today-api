import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { UserActivity } from '../../entities/user-activity.entity';
import { UserLevel } from '../../entities/user-level.entity';
import { UserBadge } from '../../entities/user-badge.entity';
import { Badge } from '../../entities/badge.entity';
import { User } from '../../entities/user.entity';
import { ActivityType } from '../../entities/user-activity.entity';
import { PurchasePointHistory } from '../../entities/purchase-point-history.entity';
import {
  calculateLevelFromPoints,
  calculateRequiredPoints,
  LEVEL_DEMOTION,
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
    @InjectRepository(PurchasePointHistory)
    private purchasePointHistoryRepository: Repository<PurchasePointHistory>,
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
        level: 0,
        activityPoints: 0,
        purchasePoints: 0,
        lastActivityAt: new Date(),
        lastPointsReductionAt: new Date(),
        levelHistory: [],
      });
    }

    // 마지막 활동 시간 업데이트
    userLevel.lastActivityAt = new Date();

    // 활동 포인트 업데이트
    userLevel.activityPoints += points;

    // 레벨 체크 (활동 포인트 기준)
    await this.checkLevel(userLevel);

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
        level: 0,
        activityPoints: 0,
        purchasePoints: 0,
        lastActivityAt: new Date(),
        lastPointsReductionAt: new Date(),
        levelHistory: [],
      });
    }

    userLevel.lastActivityAt = new Date();
    userLevel.activityPoints += points;
    await this.checkLevel(userLevel);
    await manager.save(UserLevel, userLevel);
  }

  private async checkLevel(userLevel: UserLevel) {
    const currentLevel = userLevel.level;
    const currentPoints = userLevel.activityPoints;

    // 현재 포인트에 맞는 레벨 계산
    const newLevel = calculateLevelFromPoints(currentPoints);

    // 레벨이 변경된 경우
    if (newLevel !== currentLevel) {
      // 레벨 이력 추가
      userLevel.levelHistory = userLevel.levelHistory || [];
      userLevel.levelHistory.push({
        level: newLevel,
        date: new Date(),
        reason: '포인트 획득으로 인한 레벨 상승',
      });

      userLevel.level = newLevel;
    }
  }

  async checkInactivity() {
    const inactiveUsers = await this.userLevelRepository
      .createQueryBuilder('userLevel')
      .where('userLevel.lastActivityAt < :date', {
        date: new Date(
          Date.now() - LEVEL_DEMOTION.INACTIVITY_PERIOD * 24 * 60 * 60 * 1000,
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
      if (daysSinceLastReduction >= LEVEL_DEMOTION.INACTIVITY_PERIOD) {
        const reductionCount = Math.floor(
          daysSinceLastReduction / LEVEL_DEMOTION.INACTIVITY_PERIOD,
        );
        const pointsToDeduct =
          reductionCount * LEVEL_DEMOTION.POINTS_REDUCTION_AMOUNT;

        userLevel.activityPoints = Math.max(
          LEVEL_DEMOTION.MINIMUM_POINTS,
          userLevel.activityPoints - pointsToDeduct,
        );

        // 마지막 포인트 감소일 업데이트
        userLevel.lastPointsReductionAt = new Date();

        // 레벨 체크
        await this.checkLevel(userLevel);

        // 레벨 이력 추가
        userLevel.levelHistory.push({
          level: userLevel.level,
          date: new Date(),
          reason: '활동 부족으로 인한 레벨 조정',
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
      .orWhere(`badge.requirements->>'level' IS NOT NULL`)
      .orWhere(`badge.requirements->>'points' IS NOT NULL`)
      .getMany();

    for (const badge of potentialBadges) {
      const {
        activityType: reqActivityType,
        count,
        level,
        points,
      } = badge.requirements;

      // 이미 획득한 배지인지 확인
      const existingUserBadge = await this.userBadgeRepository.findOne({
        where: { user: { id: userId }, badge: { id: badge.id } },
      });

      if (existingUserBadge) continue;

      // 조건 만족 여부 확인
      const meetsRequirements =
        (!reqActivityType || reqActivityType === activityType) &&
        (!count || activityCount >= count) &&
        (!level || userLevel.level >= level) &&
        (!points || userLevel.activityPoints >= points);

      if (meetsRequirements) {
        // 배지 획득
        const userBadge = this.userBadgeRepository.create({
          user: { id: userId },
          badge: { id: badge.id },
          earnedAt: new Date(),
          progress: {
            current: reqActivityType ? activityCount : userLevel.activityPoints,
            target: reqActivityType ? count : points,
          },
        });

        await this.userBadgeRepository.save(userBadge);
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

    // 해당 활동과 관련된 배지들 조회
    const potentialBadges = await manager
      .createQueryBuilder(Badge, 'badge')
      .where(`badge.requirements->>'activityType' = :activityType`, {
        activityType,
      })
      .orWhere(`badge.requirements->>'level' IS NOT NULL`)
      .orWhere(`badge.requirements->>'points' IS NOT NULL`)
      .getMany();

    for (const badge of potentialBadges) {
      const {
        activityType: reqActivityType,
        count,
        level,
        points,
      } = badge.requirements;

      // 이미 획득한 배지인지 확인
      const existingUserBadge = await manager.findOne(UserBadge, {
        where: { user: { id: userId }, badge: { id: badge.id } },
      });

      if (existingUserBadge) continue;

      // 조건 만족 여부 확인
      const meetsRequirements =
        (!reqActivityType || reqActivityType === activityType) &&
        (!count || activityCount >= count) &&
        (!level || userLevel.level >= level) &&
        (!points || userLevel.activityPoints >= points);

      if (meetsRequirements) {
        // 배지 획득
        const userBadge = manager.create(UserBadge, {
          user: { id: userId },
          badge: { id: badge.id },
          earnedAt: new Date(),
          progress: {
            current: reqActivityType ? activityCount : userLevel.activityPoints,
            target: reqActivityType ? count : points,
          },
        });

        await manager.save(UserBadge, userBadge);
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
        level: 0,
        activityPoints: 0,
        purchasePoints: 0,
        lastActivityAt: new Date(),
        lastPointsReductionAt: new Date(),
        levelHistory: [],
      });
      await this.userLevelRepository.save(userLevel);
    }

    // 현재 레벨과 다음 레벨을 위한 포인트 계산
    const currentLevel = userLevel.level;
    const nextLevel = currentLevel + 1;
    const currentLevelPoints = calculateRequiredPoints(currentLevel);
    const nextLevelPoints = calculateRequiredPoints(nextLevel);
    const pointsNeeded = nextLevelPoints - currentLevelPoints;
    const progress =
      pointsNeeded > 0
        ? Math.min(
            100,
            Math.round(
              ((userLevel.activityPoints - currentLevelPoints) / pointsNeeded) *
                100,
            ),
          )
        : 100;

    return {
      level: userLevel.level,
      activityPoints: userLevel.activityPoints,
      purchasePoints: userLevel.purchasePoints,
      lastActivityAt: userLevel.lastActivityAt,
      lastPointsReductionAt: userLevel.lastPointsReductionAt,
      levelHistory: userLevel.levelHistory,
      // 추가 정보
      nextLevel: nextLevel,
      nextLevelPoints: nextLevelPoints,
      pointsNeeded: Math.max(0, nextLevelPoints - userLevel.activityPoints),
      progressPercent: progress,
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
  async addPurchasePoints(
    userId: number,
    points: number,
    referenceId?: number,
    description?: string,
  ) {
    const userLevel = await this.userLevelRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!userLevel) {
      throw new Error('User level not found');
    }

    userLevel.purchasePoints += points;
    await this.userLevelRepository.save(userLevel);

    // 구매포인트 지급 내역 기록
    const history = this.purchasePointHistoryRepository.create({
      user: { id: userId },
      points,
      referenceId,
      description: description || `구매포인트 ${points}점 지급`,
    });
    await this.purchasePointHistoryRepository.save(history);
  }

  async addPurchasePointsWithManager(
    manager: EntityManager,
    userId: number,
    points: number,
    referenceId?: number,
    description?: string,
  ) {
    const userLevel = await manager.findOne(UserLevel, {
      where: { user: { id: userId } },
    });

    if (!userLevel) {
      throw new Error('User level not found');
    }

    userLevel.purchasePoints += points;
    await manager.save(UserLevel, userLevel);

    // 구매포인트 지급 내역 기록
    const history = manager.create(PurchasePointHistory, {
      user: { id: userId },
      points,
      referenceId,
      description: description || `구매포인트 ${points}점 지급`,
    });
    await manager.save(PurchasePointHistory, history);
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
