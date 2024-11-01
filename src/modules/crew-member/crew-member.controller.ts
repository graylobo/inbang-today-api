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
import { CrewMemberService } from './crew-member.service';
import { CrewMember } from '../../entities/crew-member.entity';

@Controller('crew-members')
export class CrewMemberController {
  constructor(private readonly crewMemberService: CrewMemberService) {}

  @Get('crew/:crewId')
  async findAllByCrewId(
    @Param('crewId') crewId: string,
  ): Promise<CrewMember[]> {
    return this.crewMemberService.findAllByCrewId(+crewId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CrewMember> {
    const member = await this.crewMemberService.findOne(+id);
    if (!member) {
      throw new HttpException('Member not found', HttpStatus.NOT_FOUND);
    }
    return member;
  }

  @Post()
  async create(@Body() memberData: Partial<CrewMember>): Promise<CrewMember> {
    return this.crewMemberService.create(memberData);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() memberData: Partial<CrewMember>,
  ): Promise<CrewMember> {
    return this.crewMemberService.update(+id, memberData);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.crewMemberService.delete(+id);
  }
}
