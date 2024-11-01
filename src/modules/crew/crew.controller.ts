import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { CrewService } from './crew.service';
import { Crew } from '../../entities/crew.entity';

@Controller('crews')
export class CrewController {
  constructor(private readonly crewService: CrewService) {}

  @Get('rankings')
  async getCrewRankings(
    @Query('year') yearStr: string = new Date().getFullYear().toString(),
    @Query('month') monthStr: string = (new Date().getMonth() + 1).toString(),
  ) {
    try {
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      if (isNaN(year) || isNaN(month)) {
        throw new HttpException(
          'Invalid year or month parameter',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.crewService.findAllWithMonthlyEarnings(year, month);
    } catch (error) {
      console.error('Rankings error:', error);
      throw new HttpException(
        error.message || 'Failed to fetch rankings',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(): Promise<Crew[]> {
    try {
      const crews = await this.crewService.findAll();
      console.log('Found crews:', JSON.stringify(crews, null, 2));
      return crews;
    } catch (error) {
      console.error('Error fetching crews:', error);
      throw new HttpException(
        'Failed to fetch crews',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Crew> {
    const crew = await this.crewService.findOne(+id);
    if (!crew) {
      throw new HttpException('Crew not found', HttpStatus.NOT_FOUND);
    }
    return crew;
  }

  @Post()
  async create(@Body() crewData: Partial<Crew>): Promise<Crew> {
    return this.crewService.create(crewData);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() crewData: Partial<Crew>,
  ): Promise<Crew> {
    return this.crewService.update(+id, crewData);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.crewService.delete(+id);
  }
}
