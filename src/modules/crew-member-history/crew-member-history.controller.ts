import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  CrewMemberHistoryService,
  CreateCrewMemberHistoryDto,
} from './crew-member-history.service';
import { CrewMemberHistory } from '../../entities/crew-member-history.entity';
import { AdminGuard } from '../../guards/admin.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('crew-member-histories')
export class CrewMemberHistoryController {
  constructor(
    private readonly crewMemberHistoryService: CrewMemberHistoryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(
    @Body() createDto: CreateCrewMemberHistoryDto,
  ): Promise<CrewMemberHistory> {
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
