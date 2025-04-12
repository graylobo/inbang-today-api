import { Controller, Get, Query } from '@nestjs/common';
import { GetMatchHistoryDto } from './dto/get-match-history.dto';
import { GetStreamerStatsDto } from './dto/get-streamer-stats.dto';
import { GetStreamerEloDto } from './dto/get-streamer-elo-dto';
import { GetStreamerEloRankingDto } from './dto/get-streamer-elo-ranking.dto';
import { StarCraftGameMatchService } from './services/starcraft-game-match.service';

@Controller('starcraft')
export class StarCraftGameMatchController {
  constructor(
    private readonly starCraftGameMatchService: StarCraftGameMatchService,
  ) {}

  @Get('matches')
  async findMatches(@Query() query: GetMatchHistoryDto) {
    return this.starCraftGameMatchService.findMatches(query);
  }

  @Get('stats')
  async getStreamerStats(@Query() query: GetStreamerStatsDto) {
    return this.starCraftGameMatchService.getStreamerStats(query);
  }

  @Get('elo-total')
  async getStreamerEloTotal(@Query() query: GetStreamerEloDto) {
    return this.starCraftGameMatchService.getStreamerEloTotal(query);
  }

  @Get('elo-ranking')
  async getStreamerEloRanking(@Query() query: GetStreamerEloRankingDto) {
    return this.starCraftGameMatchService.getStreamerEloRanking(query);
  }
}
