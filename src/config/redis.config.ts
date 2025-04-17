import { CacheModuleOptions } from '@nestjs/cache-manager';

export const redisConfig: CacheModuleOptions = {
  isGlobal: true,
  store: 'redis' as any,
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  ttl: 60 * 60 * 24, // 24시간
};

export const REDIS_LIKE_KEY = {
  POST_LIKES: (postId: number) => `post:${postId}:likes`,
  COMMENT_LIKES: (commentId: number) => `comment:${commentId}:likes`,
  USER_POST_LIKE: (userId: number, postId: number) =>
    `user:${userId}:post:${postId}:like`,
  USER_COMMENT_LIKE: (userId: number, commentId: number) =>
    `user:${userId}:comment:${commentId}:like`,
};
