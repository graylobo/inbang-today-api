import { ActivityType } from '../../entities/user-activity.entity';

export enum RankCategory {
  SOLDIER = 'SOLDIER', // 병
  NON_COMMISSIONED_OFFICER = 'NCO', // 부사관
  OFFICER = 'OFFICER', // 장교
  GENERAL = 'GENERAL', // 장성
}

export enum Rank {
  // 병
  PRIVATE_SECOND_CLASS = 'PRIVATE_SECOND_CLASS', // 이등병
  PRIVATE_FIRST_CLASS = 'PRIVATE_FIRST_CLASS', // 일등병
  CORPORAL = 'CORPORAL', // 상병
  SERGEANT = 'SERGEANT', // 병장

  // 부사관
  STAFF_SERGEANT = 'STAFF_SERGEANT', // 하사
  SERGEANT_FIRST_CLASS = 'SERGEANT_FIRST_CLASS', // 중사
  MASTER_SERGEANT = 'MASTER_SERGEANT', // 상사
  SERGEANT_MAJOR = 'SERGEANT_MAJOR', // 원사

  // 장교 (위관급)
  SECOND_LIEUTENANT = 'SECOND_LIEUTENANT', // 소위
  FIRST_LIEUTENANT = 'FIRST_LIEUTENANT', // 중위
  CAPTAIN = 'CAPTAIN', // 대위
  WARRANT_OFFICER = 'WARRANT_OFFICER', // 준위

  // 장교 (영관급)
  MAJOR = 'MAJOR', // 소령
  LIEUTENANT_COLONEL = 'LIEUTENANT_COLONEL', // 중령
  COLONEL = 'COLONEL', // 대령

  // 장성
  BRIGADIER_GENERAL = 'BRIGADIER_GENERAL', // 준장
  MAJOR_GENERAL = 'MAJOR_GENERAL', // 소장
  LIEUTENANT_GENERAL = 'LIEUTENANT_GENERAL', // 중장
  GENERAL = 'GENERAL', // 대장
}

export const RANK_POINTS = {
  [Rank.PRIVATE_SECOND_CLASS]: 0,
  [Rank.PRIVATE_FIRST_CLASS]: 100,
  [Rank.CORPORAL]: 300,
  [Rank.SERGEANT]: 600,
  [Rank.STAFF_SERGEANT]: 1000,
  [Rank.SERGEANT_FIRST_CLASS]: 1500,
  [Rank.MASTER_SERGEANT]: 2100,
  [Rank.SERGEANT_MAJOR]: 2800,
  [Rank.SECOND_LIEUTENANT]: 3600,
  [Rank.FIRST_LIEUTENANT]: 4500,
  [Rank.CAPTAIN]: 5500,
  [Rank.WARRANT_OFFICER]: 6600,
  [Rank.MAJOR]: 7800,
  [Rank.LIEUTENANT_COLONEL]: 9100,
  [Rank.COLONEL]: 10500,
  [Rank.BRIGADIER_GENERAL]: 12000,
  [Rank.MAJOR_GENERAL]: 13600,
  [Rank.LIEUTENANT_GENERAL]: 15300,
  [Rank.GENERAL]: 17100,
};

export const RANK_CATEGORIES = {
  [RankCategory.SOLDIER]: [
    Rank.PRIVATE_SECOND_CLASS,
    Rank.PRIVATE_FIRST_CLASS,
    Rank.CORPORAL,
    Rank.SERGEANT,
  ],
  [RankCategory.NON_COMMISSIONED_OFFICER]: [
    Rank.STAFF_SERGEANT,
    Rank.SERGEANT_FIRST_CLASS,
    Rank.MASTER_SERGEANT,
    Rank.SERGEANT_MAJOR,
  ],
  [RankCategory.OFFICER]: [
    Rank.SECOND_LIEUTENANT,
    Rank.FIRST_LIEUTENANT,
    Rank.CAPTAIN,
    Rank.WARRANT_OFFICER,
    Rank.MAJOR,
    Rank.LIEUTENANT_COLONEL,
    Rank.COLONEL,
  ],
  [RankCategory.GENERAL]: [
    Rank.BRIGADIER_GENERAL,
    Rank.MAJOR_GENERAL,
    Rank.LIEUTENANT_GENERAL,
    Rank.GENERAL,
  ],
};

// 계급 강등 관련 설정
export const RANK_DEMOTION = {
  INACTIVITY_PERIOD: 30, // 30일
  POINTS_REDUCTION_AMOUNT: 100, // 30일마다 100점 감소
  MINIMUM_POINTS: 0, // 최소 포인트
};

export const ACTIVITY_POINTS: Record<ActivityType, number> = {
  [ActivityType.POST_CREATE]: 10,
  [ActivityType.POST_LIKE]: 1,
  [ActivityType.COMMENT_CREATE]: 5,
  [ActivityType.COMMENT_LIKE]: 1,
  [ActivityType.DAILY_LOGIN]: 5,
  [ActivityType.PROFILE_COMPLETE]: 10,
  [ActivityType.POST_SHARE]: 1,
  [ActivityType.COMMENT_REPLY]: 5,
  [ActivityType.POST_VIEW]: 1,
};

export const RANK_ORDER: Record<Rank, number> = {
  [Rank.PRIVATE_SECOND_CLASS]: 0,
  [Rank.PRIVATE_FIRST_CLASS]: 1,
  [Rank.CORPORAL]: 2,
  [Rank.SERGEANT]: 3,
  [Rank.STAFF_SERGEANT]: 4,
  [Rank.SERGEANT_FIRST_CLASS]: 5,
  [Rank.MASTER_SERGEANT]: 6,
  [Rank.SERGEANT_MAJOR]: 7,
  [Rank.SECOND_LIEUTENANT]: 8,
  [Rank.FIRST_LIEUTENANT]: 9,
  [Rank.CAPTAIN]: 10,
  [Rank.WARRANT_OFFICER]: 11,
  [Rank.MAJOR]: 12,
  [Rank.LIEUTENANT_COLONEL]: 13,
  [Rank.COLONEL]: 14,
  [Rank.BRIGADIER_GENERAL]: 15,
  [Rank.MAJOR_GENERAL]: 16,
  [Rank.LIEUTENANT_GENERAL]: 17,
  [Rank.GENERAL]: 18,
};
