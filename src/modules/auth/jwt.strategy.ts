import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { Configuration } from 'src/config/configuration';
import { Request } from 'express';

// 커스텀 토큰 추출 함수: Authorization 헤더 또는 쿠키에서 토큰 추출
const cookieExtractor = (req: Request): string | null => {
  let token = null;

  // 먼저 Authorization 헤더에서 토큰 시도
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Authorization 헤더에 토큰이 없으면 쿠키에서 시도
  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService<Configuration>,
  ) {
    super({
      jwtFromRequest: cookieExtractor, // 커스텀 추출 함수 사용
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret', { infer: true }),
    });
  }

  async validate(payload: any) {
    // 디버깅을 위한 로그 추가

    // 임시 사용자인 경우 (소셜 로그인 진행 중)
    if (payload.isTempUser && payload.socialId) {
      // 임시 토큰에서는 DB 조회 없이 payload 정보를 그대로 반환
      return {
        socialId: payload.socialId,
        email: payload.email,
        isTempUser: true,
      };
    }

    // 일반 사용자인 경우 (DB에서 조회)
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id,
      sub: user.id, // sub 필드 추가 (컨트롤러에서 req.user.sub로 접근)
      name: user.name,
      isAdmin: user.isAdmin,
    };
  }
}
