import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PlatformVerificationService } from './platform-verification.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('platform-verification')
@UseGuards(JwtAuthGuard)
export class PlatformVerificationController {
  constructor(
    private readonly platformVerificationService: PlatformVerificationService,
  ) {}

  @Post(':platformName/generate-code')
  async generateAuthCode(
    @Param('platformName') platformName: string,
    @Body() body: { username: string },
    @Request() req: any,
  ) {
    const code = await this.platformVerificationService.generateAuthCode(
      platformName,
      body.username,
      req.user.userId,
    );
    return { code };
  }

  @Post(':platformName/verify')
  async verifyPlatformAuth(
    @Param('platformName') platformName: string,
    @Body() body: { username: string },
    @Request() req: any,
  ) {
    return await this.platformVerificationService.verifyPlatformAuth(
      platformName,
      body.username,
      req.user.userId,
    );
  }

  @Get(':platformName/status')
  async getPlatformAuthStatus(
    @Param('platformName') platformName: string,
    @Request() req: any,
  ) {
    return await this.platformVerificationService.getPlatformAuthStatus(
      req.user.userId,
      platformName,
    );
  }
}
