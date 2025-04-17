import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  // canActivate를 오버라이드하여 인증 실패시에도 요청을 계속 진행
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // JWT 인증 시도
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (error) {
      // 인증 실패시에도 true를 반환하여 요청 진행
      return true;
    }
  }

  // handleRequest를 오버라이드하여 인증 실패시 에러를 던지지 않고 null 반환
  handleRequest(err: any, user: any, info: any) {
    // 에러가 있거나 사용자가 없는 경우 null 반환 (에러를 던지지 않음)
    if (err || !user) {
      return null;
    }
    // 인증된 사용자 정보 반환
    return user;
  }
}
