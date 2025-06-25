import { Request } from 'express';

/**
 * Authorization 헤더 또는 쿠키에서 JWT 토큰을 추출하는 유틸리티 함수
 * @param request Express Request 객체
 * @returns 추출된 토큰 또는 null
 */
export function extractTokenFromRequest(request: Request): string | null {
  // 먼저 Authorization 헤더에서 토큰 시도
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Authorization 헤더에 토큰이 없으면 쿠키에서 시도
  if (request.cookies && request.cookies.access_token) {
    return request.cookies.access_token;
  }

  return null;
}
