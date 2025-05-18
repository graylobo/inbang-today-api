import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  CrewMemberHistoryService,
  CreateCrewMemberHistoryDto,
} from './crew-member-history.service';
import { CrewMemberHistory } from '../../entities/crew-member-history.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { AdminGuard } from '../../guards/admin.guard';
import { StreamerService } from '../streamer/streamer.service';

@Controller('crew-member-histories')
export class CrewMemberHistoryController {
  constructor(
    private readonly crewMemberHistoryService: CrewMemberHistoryService,
    private readonly streamerService: StreamerService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(
    @Body() createDto: CreateCrewMemberHistoryDto,
  ): Promise<CrewMemberHistory> {
    if (createDto.eventType === 'join') {
      await this.streamerService.joinCrew(
        createDto.streamerId,
        createDto.crewId,
        createDto.newRankId,
      );
    } else if (createDto.eventType === 'leave') {
      await this.streamerService.leaveCrew(createDto.streamerId);
    } else if (createDto.eventType === 'rank_change') {
      await this.streamerService.updateRank(
        createDto.streamerId,
        createDto.newRankId,
      );
    }

    return this.crewMemberHistoryService.create(createDto);
  }

  @Get('streamer/:id')
  async findAllByStreamer(
    @Param('id') id: string,
  ): Promise<CrewMemberHistory[]> {
    return this.crewMemberHistoryService.findAllByStreamerId(+id);
  }

  @Get('crew/:id')
  async findAllByCrew(@Param('id') id: string): Promise<CrewMemberHistory[]> {
    return this.crewMemberHistoryService.findAllByCrewId(+id);
  }
}
