import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SoopAuthService } from './soop-auth.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('soop-auth')
@UseGuards(JwtAuthGuard)
export class SoopAuthController {
  constructor(private readonly soopAuthService: SoopAuthService) {}

  @Post('generate-code')
  async generateAuthCode(
    @Body() body: { username: string },
    @Request() req: any,
  ) {
    const code = await this.soopAuthService.generateAuthCode(
      body.username,
      req.user.userId,
    );
    return { code };
  }

  @Post('verify')
  async verifySoopAuth(
    @Body() body: { username: string },
    @Request() req: any,
  ) {
    return await this.soopAuthService.verifySoopAuth(
      body.username,
      req.user.userId,
    );
  }

  @Get('status')
  async getSoopAuthStatus(@Request() req: any) {
    return await this.soopAuthService.getSoopAuthStatus(req.user.userId);
  }
}
