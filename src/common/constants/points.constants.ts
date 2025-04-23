import { ActivityType } from '../../entities/user-activity.entity';

export const ACTIVITY_POINTS: Record<ActivityType, number> = {
  [ActivityType.POST_CREATE]: 10,
  [ActivityType.COMMENT_CREATE]: 5,
  [ActivityType.POST_LIKE]: 1,
  [ActivityType.COMMENT_LIKE]: 1,
  [ActivityType.DAILY_LOGIN]: 2,
  [ActivityType.PROFILE_COMPLETE]: 20,
  [ActivityType.POST_SHARE]: 3,
  [ActivityType.COMMENT_REPLY]: 3,
  [ActivityType.POST_VIEW]: 0.1, // 조회수는 소수점으로 계산
};

export const LEVEL_POINTS = {
  BASE_POINTS: 100, // 1레벨 기준 포인트
  MULTIPLIER: 1.2, // 레벨업에 필요한 포인트 증가율
  MAX_LEVEL: 12, // 최대 레벨
};

export const UNLOCKED_FEATURES = {
  LEVEL_5: ['CUSTOM_EMOJI', 'PROFILE_BACKGROUND'],
  LEVEL_10: ['ANIMATED_EMOJI', 'CUSTOM_TITLE'],
  LEVEL_20: ['SPECIAL_BADGE', 'EXCLUSIVE_CONTENT'],
  LEVEL_50: ['VIP_BADGE', 'PRIORITY_SUPPORT'],
};
