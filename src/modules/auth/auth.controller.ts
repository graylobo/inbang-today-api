import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Query,
  Res,
  UnauthorizedException,
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
    const { access_token, isNewUser, tempUserInfo } =
      await this.authService.googleLogin(code);
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: this.getCookieDomain(),
    });

    // 새 사용자인 경우 tempUserInfo도 쿠키에 저장 (JSON으로 변환)
    if (isNewUser && tempUserInfo) {
      res.cookie('temp_user_info', JSON.stringify(tempUserInfo), {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        domain: this.getCookieDomain(),
        maxAge: 30 * 60 * 1000, // 30분 (임시 토큰과 동일한 만료 시간)
      });
    }

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

  // 임시 사용자의 닉네임 설정 (소셜 로그인 완료)
  @UseGuards(JwtAuthGuard)
  @Post('complete-social-signup')
  async completeSocialSignup(
    @Request() req,
    @Body() data: { name: string; tempUserInfo: any },
  ) {
    // 임시 사용자 정보 검증 (토큰 검증은 이미 JWT 미들웨어에서 처리됨)
    if (!req.user.isTempUser || !req.user.socialId) {
      throw new UnauthorizedException('유효하지 않은 요청입니다.');
    }

    // 닉네임과 함께 사용자 생성
    const socialUserInfo = data.tempUserInfo;

    // 소셜 ID 일치 여부 확인 (보안 강화)
    if (req.user.socialId !== socialUserInfo.socialId) {
      throw new UnauthorizedException('유효하지 않은 요청입니다.');
    }

    const user = await this.authService.createSocialUserWithNickname(
      socialUserInfo,
      data.name,
    );

    // 정식 토큰 발급
    const token = await this.authService.login(user);

    return token;
  }

  @UseGuards(JwtAuthGuard)
  @Post('update-nickname')
  async updateNickname(@Request() req, @Body() data: { name: string }) {
    // 임시 사용자는 이 엔드포인트 사용 불가
    if (req.user.isTempUser) {
      throw new UnauthorizedException(
        '임시 사용자는 닉네임을 수정할 수 없습니다. complete-social-signup을 사용하세요.',
      );
    }

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
