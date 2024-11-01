import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { CrewRankService } from './crew-rank.service';
import { CrewRank } from '../../entities/crew-rank.entity';

@Controller('crew-ranks')
export class CrewRankController {
  constructor(private readonly crewRankService: CrewRankService) {}

  @Get('crew/:crewId')
  async findAllByCrewId(@Param('crewId') crewId: string): Promise<CrewRank[]> {
    return this.crewRankService.findAllByCrewId(+crewId);
  }

  @Post()
  async create(@Body() rankData: Partial<CrewRank>): Promise<CrewRank> {
    return this.crewRankService.create(rankData);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() rankData: Partial<CrewRank>,
  ): Promise<CrewRank> {
    return this.crewRankService.update(+id, rankData);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.crewRankService.delete(+id);
  }
} 