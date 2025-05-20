import { StreamerGender } from 'src/entities/types/streamer.type';

export class StreamerRankItemDto {
  /**
   * 스트리머 ID
   */
  id: number;

  /**
   * 스트리머 이름
   */
  name: string;

  /**
   * 스트리머 닉네임 (있는 경우)
   */
  nickname?: string;

  /**
   * 스트리머 티어 (있는 경우)
   */
  tier?: string;

  /**
   * 스트리머 종족
   */
  race?: string;

  /**
   * 스트리머 성별
   */
  gender?: StreamerGender;

  /**
   * ELO 포인트
   */
  eloPoint: number;

  /**
   * 순위
   */
  rank: number;

  /**
   * 소속 크루 정보 (있는 경우)
   */
  crew?: {
    id: number;
    name: string;
  };
}

export class MonthlyRankingResponseDto {
  /**
   * 조회 월 (YYYY-MM)
   */
  month: string;

  /**
   * 조회 성별
   */
  gender?: StreamerGender;

  /**
   * 스트리머 순위 목록
   */
  rankings: StreamerRankItemDto[];

  /**
   * 총 스트리머 수
   */
  total: number;
}
