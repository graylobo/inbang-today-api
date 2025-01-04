import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Streamer } from '../../entities/streamer.entity';
import { AdminGuard } from '../../guards/admin.guard';
import { StreamerService } from 'src/modules/streamer/streamer.service';

@Controller('streamers')
export class StreamerController {
  constructor(private readonly streamerService: StreamerService) {}

  @Get()
  async findAll(): Promise<Streamer[]> {
    return this.streamerService.findAll();
  }

  @Get('crew/:crewId')
  async findAllByCrewId(@Param('crewId') crewId: string): Promise<Streamer[]> {
    return this.streamerService.findAllByCrewId(+crewId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Streamer> {
    const member = await this.streamerService.findOne(+id);
    if (!member) {
      throw new HttpException('Member not found', HttpStatus.NOT_FOUND);
    }
    return member;
  }

  @UseGuards(AdminGuard)
  @Post()
  async create(@Body() memberData: Partial<Streamer>): Promise<Streamer> {
    try {
      return await this.streamerService.create(memberData);
    } catch (error) {
      throw new HttpException(
        'Failed to create member',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AdminGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() memberData: Partial<Streamer>,
  ): Promise<Streamer> {
    try {
      const member = await this.streamerService.findOne(+id);
      if (!member) {
        throw new HttpException('Member not found', HttpStatus.NOT_FOUND);
      }
      return await this.streamerService.update(+id, memberData);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to update member',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.streamerService.delete(+id);
  }
}
