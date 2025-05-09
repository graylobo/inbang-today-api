import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { Configuration } from 'src/config/configuration';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService<Configuration>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
