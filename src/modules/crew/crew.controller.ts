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
} from '@nestjs/common';
import { CrewService } from './crew.service';
import { Crew } from '../../entities/crew.entity';

@Controller('crews')
export class CrewController {
  constructor(private readonly crewService: CrewService) {}

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
