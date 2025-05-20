import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StreamerEloRecord } from 'src/entities/streamer-elo-record.entity';
import { Repository } from 'typeorm';
import {
  MonthlyRankingResponseDto,
  StreamerRankItemDto,
} from './dto/monthly-ranking-response.dto';
import { StreamerGender } from 'src/entities/types/streamer.type';

@Injectable()
export class EloRankingService {
  constructor(
    @InjectRepository(StreamerEloRecord)
    private readonly streamerEloRecordRepository: Repository<StreamerEloRecord>,
  ) {}

  /**
   * 월별 스트리머 ELO 포인트 랭킹을 조회합니다.
   * @param month 조회할 연-월 (YYYY-MM 형식)
   * @param gender 성별 필터 (선택적)
   */
  async getMonthlyRanking(
    month: string,
    gender?: StreamerGender,
  ): Promise<MonthlyRankingResponseDto> {
    // 쿼리 빌더 생성
    const query = this.streamerEloRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.streamer', 'streamer')
      .leftJoinAndSelect('streamer.crew', 'crew')
      .where('record.month = :month', { month });

    // 성별 필터 적용 (선택적)
    if (gender) {
      query.andWhere('streamer.gender = :gender', { gender });
    }

    // 쿼리 실행
    const records = await query.orderBy('record.eloPoint', 'DESC').getMany();

    // 스트리머별 순위 매기기
    const rankings: StreamerRankItemDto[] = records.map((record, index) => {
      const { streamer } = record;

      return {
        id: streamer.id,
        name: streamer.name,
        nickname: streamer.nickname,
        soopId: streamer.soopId,
        tier: streamer.tier,
        race: streamer.race,
        gender: streamer.gender,
        eloPoint: record.eloPoint,
        rank: index + 1, // 순위는 0부터 시작하므로 +1
        crew: streamer.crew
          ? {
              id: streamer.crew.id,
              name: streamer.crew.name,
            }
          : undefined,
      };
    });

    // 응답 데이터 생성
    return {
      month,
      gender,
      rankings,
      total: rankings.length,
    };
  }
}
