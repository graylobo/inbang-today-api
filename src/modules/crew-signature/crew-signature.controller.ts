import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CrewSignature } from '../../entities/crew-signature.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CrewSignatureService } from './crew-signature.service';

@Controller('crew-signatures')
export class CrewSignatureController {
  constructor(private readonly signatureService: CrewSignatureService) {}

  @Get('crew/:crewId')
  async findAllByCrewId(
    @Param('crewId') crewId: string,
  ): Promise<CrewSignature[]> {
    return await this.signatureService.findAllByCrewId(+crewId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() signatureData: any, @Request() req) {
    const userId = req.user?.userId;
    return await this.signatureService.create(signatureData, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() signatureData: any,
    @Request() req,
  ): Promise<CrewSignature> {
    const userId = req.user?.userId;
    return await this.signatureService.update(+id, signatureData, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.signatureService.delete(+id);
  }
}
