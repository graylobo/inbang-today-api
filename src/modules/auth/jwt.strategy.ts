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
    console.log('JWT Payload:', payload);

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    console.log('Found User:', user);

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    };
  }
}
