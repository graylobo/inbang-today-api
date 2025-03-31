import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
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
    if (!user) {
      throw new HttpException(
        'Invalid username or password',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() userData: { name: string; password: string }) {
    try {
      const hashedPassword = await this.authService.hashPassword(
        userData.password,
      );
      const user = await this.authService.createUser({
        name: userData.name,
        password: hashedPassword,
      });
      return { message: 'User registered successfully', userId: user.id };
    } catch (error) {
      throw new HttpException(
        'Failed to register user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    console.log('googleCallback:::', code);
    const access_token = await this.authService.googleLogin(code);
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: this.getCookieDomain(),
    });

    res.redirect(
      `${this.configService.get('CLIENT_URL')}/auth/google/callback`,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }

  private getCookieDomain(): string | undefined {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    return isProduction ? '.coincoin.kr' : undefined;
  }
}
