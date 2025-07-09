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
  Request,
  UseGuards,
} from '@nestjs/common';
import { CrewSignature } from '../../entities/crew-signature.entity';
import { AdminGuard } from '../../guards/admin.guard';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CrewSignatureService } from './crew-signature.service';

@Controller('crew-signatures')
export class CrewSignatureController {
  constructor(private readonly signatureService: CrewSignatureService) {}

  @Get('crew/:crewId')
  async findAllByCrewId(
    @Param('crewId') crewId: string,
  ): Promise<CrewSignature[]> {
    try {
      return await this.signatureService.findAllByCrewId(+crewId);
    } catch {
      throw new HttpException(
        'Failed to fetch signatures',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async create(@Body() signatureData: any, @Request() req) {
    try {
      const userId = req.user?.userId;
      return await this.signatureService.create(signatureData, userId);
    } catch {
      throw new HttpException(
        'Failed to create signature',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() signatureData: any,
    @Request() req,
  ): Promise<CrewSignature> {
    try {
      const userId = req.user?.userId;
      return await this.signatureService.update(+id, signatureData, userId);
    } catch {
      throw new HttpException(
        'Failed to update signature',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    try {
      await this.signatureService.delete(+id);
    } catch {
      throw new HttpException(
        'Failed to delete signature',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
