import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Query,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('login')
  async login(@Body() loginData: { name: string; password: string }) {
    const user = await this.authService.validateUser(
      loginData.name,
      loginData.password,
    );

    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() userData: { name: string; password: string }) {
    const hashedPassword = await this.authService.hashPassword(
      userData.password,
    );
    const user = await this.authService.createUser({
      name: userData.name,
      password: hashedPassword,
    });
    return { message: 'User registered successfully', userId: user.id };
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    const { access_token, isNewUser } =
      await this.authService.googleLogin(code);
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: this.getCookieDomain(),
    });

    // Redirect to the set-nickname page if it's a new user
    const redirectUrl = isNewUser
      ? `${this.configService.get('CLIENT_URL')}/auth/set-nickname`
      : `${this.configService.get('CLIENT_URL')}/auth/google/callback`;

    res.redirect(redirectUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }

  @Get('verify-nickname')
  async verifyNickname(@Query('nickname') nickname: string) {
    const isAvailable = await this.authService.isNicknameAvailable(nickname);
    return { isAvailable };
  }

  @UseGuards(JwtAuthGuard)
  @Post('update-nickname')
  async updateNickname(@Request() req, @Body() data: { name: string }) {
    const user = await this.authService.updateUserNickname(
      req.user.sub,
      data.name,
    );
    return { user };
  }

  private getCookieDomain(): string | undefined {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    return isProduction ? '.inbangtoday.com' : undefined;
  }
}
