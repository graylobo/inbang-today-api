import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BoardService } from '../modules/board/board.service';

@Injectable()
export class BoardAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly boardService: BoardService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const postData = request.body;

    // 게시판 ID가 없는 경우 처리
    if (!postData || !postData.boardId) {
      throw new UnauthorizedException('게시판 정보가 없습니다.');
    }

    // 게시판 정보 조회
    const board = await this.boardService.findById(postData.boardId);

    // 익명 게시판인 경우 인증 불필요
    if (board.isAnonymous) {
      return true;
    }

    // 익명 게시판이 아닌 경우 JWT 인증 필요
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.verify(token);

      // 인증된 사용자 정보를 request에 추가
      request.user = decoded;

      return true;
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 인증 토큰입니다.');
    }
  }
}
