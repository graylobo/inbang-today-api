import { Controller, Get, Query } from '@nestjs/common';
import { EloRankingService } from './elo-ranking.service';
import { GetMonthlyRankingDto } from './dto/get-monthly-ranking.dto';
import { MonthlyRankingResponseDto } from './dto/monthly-ranking-response.dto';

@Controller('elo-rankings')
export class EloRankingController {
  constructor(private readonly eloRankingService: EloRankingService) {}

  /**
   * 월별 스트리머 ELO 포인트 랭킹을 조회합니다.
   * @param query 조회 파라미터
   */
  @Get('monthly')
  async getMonthlyRanking(
    @Query() query: GetMonthlyRankingDto,
  ): Promise<MonthlyRankingResponseDto> {
    return this.eloRankingService.getMonthlyRanking(query.month, query.gender);
  }
}
