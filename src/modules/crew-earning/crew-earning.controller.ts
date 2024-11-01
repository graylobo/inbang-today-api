import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CrewEarningService } from './crew-earning.service';
import { CrewEarning } from '../../entities/crew-earning.entity';

@Controller('crew-earnings')
export class CrewEarningController {
  constructor(private readonly crewEarningService: CrewEarningService) {}

  @Post()
  async create(
    @Body() earningData: Partial<CrewEarning>,
  ): Promise<CrewEarning> {
    try {
      return await this.crewEarningService.create(earningData);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create earning record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/report')
  async reportEarning(@Param('id') id: string): Promise<void> {
    try {
      await this.crewEarningService.reportEarning(+id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to report earning',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('crew/:crewId')
  async getCrewEarnings(
    @Param('crewId') crewId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      return await this.crewEarningService.getCrewEarningsByDateRange(
        +crewId,
        new Date(startDate),
        new Date(endDate),
      );
    } catch (error) {
      throw new HttpException(
        'Failed to fetch crew earnings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
