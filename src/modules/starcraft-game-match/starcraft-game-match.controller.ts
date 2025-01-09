import { Controller, Get, Query } from '@nestjs/common';
import { GetMatchHistoryDto } from './dto/get-match-history.dto';
import { GetStreamerStatsDto } from './dto/get-streamer-stats.dto';
import { StarCraftGameMatchService } from './starcraft-game-match.service';

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
}
