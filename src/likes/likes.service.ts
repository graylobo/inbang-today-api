import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { REDIS_LIKE_KEY } from '../config/redis.config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostLike } from '../entities/post-like.entity';
import { CommentLike } from '../entities/comment-like.entity';

@Injectable()
export class LikesService {
  constructor(
    @InjectQueue('likes') private likesQueue: Queue,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(PostLike)
    private readonly postLikeRepository: Repository<PostLike>,
    @InjectRepository(CommentLike)
    private readonly commentLikeRepository: Repository<CommentLike>,
  ) {}

  async togglePostLike(
    postId: number,
    userId: number | null,
    ipAddress: string | null,
  ) {
    const userLikeKey = userId
      ? REDIS_LIKE_KEY.USER_POST_LIKE(userId, postId)
      : `ip:${ipAddress}:post:${postId}:like`;

    // Redis에서 사용자의 좋아요 상태 확인
    const hasLiked = await this.cacheManager.get(userLikeKey);

    // 좋아요 토글 작업을 큐에 추가 (BullMQ 스타일)
    await this.likesQueue.add(
      'handleLike',
      {
        userId,
        ipAddress,
        targetId: postId,
        type: 'post',
        action: hasLiked ? 'unlike' : 'like',
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    );

    // 낙관적 업데이트를 위해 즉시 캐시 상태 변경
    if (hasLiked) {
      await this.cacheManager.del(userLikeKey);
      return false; // 좋아요 취소됨
    } else {
      await this.cacheManager.set(userLikeKey, '1');
      return true; // 좋아요됨
    }
  }

  async toggleCommentLike(
    commentId: number,
    userId: number | null,
    ipAddress: string | null,
  ) {
    const userLikeKey = userId
      ? REDIS_LIKE_KEY.USER_COMMENT_LIKE(userId, commentId)
      : `ip:${ipAddress}:comment:${commentId}:like`;

    // Redis에서 사용자의 좋아요 상태 확인
    const hasLiked = await this.cacheManager.get(userLikeKey);

    // 좋아요 토글 작업을 큐에 추가 (BullMQ 스타일)
    await this.likesQueue.add(
      'handleLike',
      {
        userId,
        ipAddress,
        targetId: commentId,
        type: 'comment',
        action: hasLiked ? 'unlike' : 'like',
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    );

    // 낙관적 업데이트를 위해 즉시 캐시 상태 변경
    if (hasLiked) {
      await this.cacheManager.del(userLikeKey);
      return false; // 좋아요 취소됨
    } else {
      await this.cacheManager.set(userLikeKey, '1');
      return true; // 좋아요됨
    }
  }

  async getPostLikeCount(postId: number): Promise<number> {
    const likeKey = REDIS_LIKE_KEY.POST_LIKES(postId);
    const cachedCount = await this.cacheManager.get<number>(likeKey);

    if (cachedCount !== undefined) {
      return cachedCount;
    }

    // 캐시가 없는 경우 DB에서 조회
    const count = await this.postLikeRepository.count({
      where: { post: { id: postId } },
    });

    // 조회한 결과를 캐시에 저장
    await this.cacheManager.set(likeKey, count);
    return count;
  }

  async getCommentLikeCount(commentId: number): Promise<number> {
    const likeKey = REDIS_LIKE_KEY.COMMENT_LIKES(commentId);
    const cachedCount = await this.cacheManager.get<number>(likeKey);

    if (cachedCount !== undefined) {
      return cachedCount;
    }

    // 캐시가 없는 경우 DB에서 조회
    const count = await this.commentLikeRepository.count({
      where: { comment: { id: commentId } },
    });

    // 조회한 결과를 캐시에 저장
    await this.cacheManager.set(likeKey, count);
    return count;
  }

  async hasUserLikedPost(
    postId: number,
    userId: number | null,
    ipAddress: string | null,
  ): Promise<boolean> {
    const userLikeKey = userId
      ? REDIS_LIKE_KEY.USER_POST_LIKE(userId, postId)
      : `ip:${ipAddress}:post:${postId}:like`;

    const hasLiked = await this.cacheManager.get(userLikeKey);
    if (hasLiked !== undefined) {
      return !!hasLiked;
    }

    // 캐시가 없는 경우 DB에서 조회
    const exists = await this.postLikeRepository.exists({
      where: userId
        ? { post: { id: postId }, user: { id: userId } }
        : { post: { id: postId }, ipAddress },
    });

    // 조회한 결과를 캐시에 저장
    if (exists) {
      await this.cacheManager.set(userLikeKey, '1');
    }
    return exists;
  }

  async hasUserLikedComment(
    commentId: number,
    userId: number | null,
    ipAddress: string | null,
  ): Promise<boolean> {
    const userLikeKey = userId
      ? REDIS_LIKE_KEY.USER_COMMENT_LIKE(userId, commentId)
      : `ip:${ipAddress}:comment:${commentId}:like`;

    const hasLiked = await this.cacheManager.get(userLikeKey);
    if (hasLiked !== undefined) {
      return !!hasLiked;
    }

    // 캐시가 없는 경우 DB에서 조회
    const exists = await this.commentLikeRepository.exists({
      where: userId
        ? { comment: { id: commentId }, user: { id: userId } }
        : { comment: { id: commentId }, ipAddress },
    });

    // 조회한 결과를 캐시에 저장
    if (exists) {
      await this.cacheManager.set(userLikeKey, '1');
    }
    return exists;
  }
}
