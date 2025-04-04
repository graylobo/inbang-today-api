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
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { CrewMemberService } from './crew-member.service';
import { Streamer } from '../../entities/streamer.entity';
import { AdminGuard } from '../../guards/admin.guard';

@Controller('crew-members')
export class CrewMemberController {
  constructor(private readonly crewMemberService: CrewMemberService) {}

  @Get()
  async findAll(): Promise<Streamer[]> {
    return this.crewMemberService.findAll();
  }

  @Get('crew/:crewId')
  async findAllByCrewId(@Param('crewId') crewId: string): Promise<Streamer[]> {
    return this.crewMemberService.findAllByCrewId(+crewId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Streamer> {
    const member = await this.crewMemberService.findOne(+id);
    if (!member) {
      throw new HttpException('Member not found', HttpStatus.NOT_FOUND);
    }
    return member;
  }

  @UseGuards(AdminGuard)
  @Post()
  async create(@Body() memberData: Partial<Streamer>): Promise<Streamer> {
    try {
      return await this.crewMemberService.create(memberData);
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
      const member = await this.crewMemberService.findOne(+id);
      if (!member) {
        throw new HttpException('Member not found', HttpStatus.NOT_FOUND);
      }
      return await this.crewMemberService.update(+id, memberData);
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
    await this.crewMemberService.delete(+id);
  }
}
