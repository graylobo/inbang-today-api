import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { LikesProcessor } from './likes.processor';
import { PostLike } from '../entities/post-like.entity';
import { CommentLike } from '../entities/comment-like.entity';
import { Post } from '../entities/post.entity';
import { Comment } from '../entities/comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PostLike, CommentLike, Post, Comment]),
    BullModule.registerQueue({
      name: 'likes',
    }),
    CacheModule.registerAsync({
      useFactory: () => {
        return {
          store: redisStore as any,
          socket: {
            host: process.env.REDIS_HOST || 'redis',
            port: parseInt(process.env.REDIS_PORT, 10) || 6379,
          },
          ttl: 60 * 60 * 24, // 24시간
        };
      },
    }),
  ],
  controllers: [LikesController],
  providers: [LikesService, LikesProcessor],
  exports: [LikesService],
})
export class LikesModule {}
