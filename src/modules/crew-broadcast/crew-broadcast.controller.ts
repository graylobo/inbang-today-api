import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CrewBroadcastService } from './crew-broadcast.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('crew-broadcasts')
export class CrewBroadcastController {
  constructor(private readonly crewBroadcastService: CrewBroadcastService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() broadcastData: any, @Request() req: any) {
    return this.crewBroadcastService.create({
      ...broadcastData,
      submittedById: req.user.userId,
    });
  }

  @Get()
  async findByCrewAndDateRange(
    @Query('crewId') crewId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.crewBroadcastService.findByCrewAndDateRange(
      +crewId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
