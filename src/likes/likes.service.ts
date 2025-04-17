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
import { Post } from '../entities/post.entity';
import { Comment } from '../entities/comment.entity';
import { Interval } from '@nestjs/schedule';

// 배치 처리를 위한 인터페이스 정의
interface PendingLikeAction {
  userId: number | null;
  ipAddress: string | null;
  targetId: number;
  action: 'like' | 'unlike' | 'dislike' | 'undislike';
  type: 'post' | 'comment';
  timestamp: number;
}

@Injectable()
export class LikesService {
  // 배치 처리를 위한 메모리 저장소
  private pendingLikes: Map<string, PendingLikeAction> = new Map();
  // 배치 처리 간격 (밀리초)
  private readonly BATCH_INTERVAL = 5000; // 5초
  // 배치 처리가 예약되었는지 추적
  private batchScheduled = false;

  constructor(
    @InjectQueue('likes') private likesQueue: Queue,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(Post) private postRepository: Repository<Post>,
    @InjectRepository(Comment) private commentRepository: Repository<Comment>,
    @InjectRepository(PostLike)
    private postLikeRepository: Repository<PostLike>,
    @InjectRepository(CommentLike)
    private commentLikeRepository: Repository<CommentLike>,
  ) {}

  // 5초마다 배치 처리 실행
  @Interval(5000)
  async processBatch() {
    if (this.pendingLikes.size === 0) return;

    console.log(`Processing batch of ${this.pendingLikes.size} like actions`);

    // 현재 배치에 있는 항목들 복사
    const batch = Array.from(this.pendingLikes.values());
    // 배치 초기화
    this.pendingLikes.clear();

    // 액션 별로 그룹화하여 처리
    const postLikes = batch.filter(
      (item) => item.type === 'post' && item.action === 'like',
    );
    const postUnlikes = batch.filter(
      (item) => item.type === 'post' && item.action === 'unlike',
    );
    const postDislikes = batch.filter(
      (item) => item.type === 'post' && item.action === 'dislike',
    );
    const postUndislikes = batch.filter(
      (item) => item.type === 'post' && item.action === 'undislike',
    );

    const commentLikes = batch.filter(
      (item) => item.type === 'comment' && item.action === 'like',
    );
    const commentUnlikes = batch.filter(
      (item) => item.type === 'comment' && item.action === 'unlike',
    );

    console.log(
      `Batch details: ${postLikes.length} likes, ${postUnlikes.length} unlikes, ${postDislikes.length} dislikes, ${postUndislikes.length} undislikes`,
    );

    // 각 그룹별로 큐에 작업 추가
    for (const item of [
      ...postLikes,
      ...postUnlikes,
      ...postDislikes,
      ...postUndislikes,
      ...commentLikes,
      ...commentUnlikes,
    ]) {
      const actionType = item.action.startsWith('un')
        ? item.action.substring(2)
        : item.action;

      const isRemoval = item.action.startsWith('un');

      console.log(
        `Adding job to queue: ${actionType} (removal: ${isRemoval}) for ${item.type}:${item.targetId}, user:${item.userId || item.ipAddress}`,
      );

      await this.likesQueue.add(
        'processLike',
        {
          userId: item.userId,
          ipAddress: item.ipAddress,
          targetId: item.targetId,
          action: actionType as 'like' | 'dislike',
          isRemoval: isRemoval,
          type: item.type,
        },
        {
          // 같은 항목이 중복 처리되지 않도록 jobId 설정
          jobId: `${item.type}:${item.targetId}:${item.userId || item.ipAddress}:${item.action}`,
        },
      );
    }
  }

  // 좋아요 액션을 배치 큐에 추가
  private addToBatch(action: PendingLikeAction): void {
    // 유형, 타겟ID, 사용자/IP, 액션타입을 포함한 고유 키 생성
    // 'un'으로 시작하는 액션은 기본 액션으로 변환 (예: unlike → like)
    const actionBase = action.action.startsWith('un')
      ? action.action.substring(2)
      : action.action;

    const key = `${action.type}:${action.targetId}:${action.userId || action.ipAddress}:${actionBase}`;

    // 더 자세한 로깅
    console.log(
      `Adding action to batch with key: ${key}, action: ${action.action}`,
    );

    // 이미 동일한 키가 있으면 최신 액션으로 업데이트
    // 없으면 새로 추가
    this.pendingLikes.set(key, {
      ...action,
      timestamp: Date.now(),
    });

    // 현재 배치 크기 로그
    console.log(`Current batch size: ${this.pendingLikes.size}`);
  }

  // 포스트 좋아요 상태 토글 - 배치 대신 직접 처리 방식으로 변경
  async togglePostLike(
    postId: number,
    action: 'like' | 'dislike',
    userId?: number,
    ipAddress?: string,
  ) {
    console.log(
      `[DIRECT] togglePostLike - postId: ${postId}, action: ${action}, userId: ${userId}, ip: ${ipAddress}`,
    );

    // 인증된 사용자나 IP 주소가 없으면 에러
    if (!userId && !ipAddress) {
      throw new Error('User ID or IP address is required');
    }

    try {
      // 1. 현재 상태 확인 - 이미 좋아요/싫어요 레코드가 있는지 확인
      const existingLike = await this.postLikeRepository.findOne({
        where: {
          post: { id: postId },
          ...(userId ? { user: { id: userId } } : { ipAddress }),
        },
      });

      console.log(
        `[DIRECT] Existing like record:`,
        existingLike
          ? `Found (isDislike: ${existingLike.isDislike})`
          : 'Not found',
      );

      const post = await this.postRepository.findOne({ where: { id: postId } });
      if (!post) {
        throw new Error('Post not found');
      }

      // 2. 액션에 따른 처리
      if (action === 'like') {
        // 좋아요 처리
        if (!existingLike) {
          // 처음 좋아요 누르는 경우 - 레코드 생성
          console.log(`[DIRECT] Creating new like record`);
          const newLike = this.postLikeRepository.create({
            post,
            user: userId ? { id: userId } : null,
            ipAddress,
            isDislike: false,
          });

          const savedLike = await this.postLikeRepository.save(newLike);
          console.log(
            `[DIRECT] New like record created with ID: ${savedLike.id}`,
          );

          // 좋아요 카운터 증가
          await this.postRepository.increment({ id: postId }, 'likeCount', 1);

          // Redis 캐시 업데이트
          const likeKey = REDIS_LIKE_KEY.POST_LIKES(postId);
          const userLikeKey = userId
            ? REDIS_LIKE_KEY.USER_POST_LIKE(userId, postId)
            : `ip:${ipAddress}:post:${postId}:like`;

          await this.cacheManager.set(userLikeKey, '1');
          const currentLikes =
            (await this.cacheManager.get<number>(likeKey)) || 0;
          await this.cacheManager.set(likeKey, currentLikes + 1);

          return {
            liked: true,
            disliked: false,
            likeCount: post.likeCount + 1,
            dislikeCount: post.dislikeCount,
          };
        } else if (existingLike.isDislike) {
          // 이미 싫어요가 있는 경우 - 좋아요로 변경
          console.log(`[DIRECT] Converting dislike to like`);
          existingLike.isDislike = false;
          await this.postLikeRepository.save(existingLike);

          // 카운터 조정 (싫어요 -1, 좋아요 +1)
          await this.postRepository.increment({ id: postId }, 'likeCount', 1);
          await this.postRepository.decrement(
            { id: postId },
            'dislikeCount',
            1,
          );

          // Redis 캐시 업데이트
          const likeKey = REDIS_LIKE_KEY.POST_LIKES(postId);
          const dislikeKey = REDIS_LIKE_KEY.POST_DISLIKES(postId);
          const userLikeKey = userId
            ? REDIS_LIKE_KEY.USER_POST_LIKE(userId, postId)
            : `ip:${ipAddress}:post:${postId}:like`;
          const userDislikeKey = userId
            ? REDIS_LIKE_KEY.USER_POST_DISLIKE(userId, postId)
            : `ip:${ipAddress}:post:${postId}:dislike`;

          await this.cacheManager.set(userLikeKey, '1');
          await this.cacheManager.del(userDislikeKey);

          const currentLikes =
            (await this.cacheManager.get<number>(likeKey)) || 0;
          const currentDislikes =
            (await this.cacheManager.get<number>(dislikeKey)) || 0;

          await this.cacheManager.set(likeKey, currentLikes + 1);
          if (currentDislikes > 0) {
            await this.cacheManager.set(dislikeKey, currentDislikes - 1);
          }

          return {
            liked: true,
            disliked: false,
            likeCount: post.likeCount + 1,
            dislikeCount: Math.max(0, post.dislikeCount - 1),
          };
        } else {
          // 이미 좋아요가 있는 경우 - 좋아요 취소
          console.log(`[DIRECT] Canceling existing like`);
          await this.postLikeRepository.remove(existingLike);

          // 좋아요 카운터 감소
          await this.postRepository.decrement({ id: postId }, 'likeCount', 1);

          // Redis 캐시 업데이트
          const likeKey = REDIS_LIKE_KEY.POST_LIKES(postId);
          const userLikeKey = userId
            ? REDIS_LIKE_KEY.USER_POST_LIKE(userId, postId)
            : `ip:${ipAddress}:post:${postId}:like`;

          await this.cacheManager.del(userLikeKey);
          const currentLikes =
            (await this.cacheManager.get<number>(likeKey)) || 0;
          if (currentLikes > 0) {
            await this.cacheManager.set(likeKey, currentLikes - 1);
          }

          return {
            liked: false,
            disliked: false,
            likeCount: Math.max(0, post.likeCount - 1),
            dislikeCount: post.dislikeCount,
          };
        }
      } else if (action === 'dislike') {
        // 싫어요 처리
        if (!existingLike) {
          // 처음 싫어요 누르는 경우 - 레코드 생성
          console.log(`[DIRECT] Creating new dislike record`);
          const newDislike = this.postLikeRepository.create({
            post,
            user: userId ? { id: userId } : null,
            ipAddress,
            isDislike: true,
          });

          const savedDislike = await this.postLikeRepository.save(newDislike);
          console.log(
            `[DIRECT] New dislike record created with ID: ${savedDislike.id}`,
          );

          // 싫어요 카운터 증가
          await this.postRepository.increment(
            { id: postId },
            'dislikeCount',
            1,
          );

          // Redis 캐시 업데이트
          const dislikeKey = REDIS_LIKE_KEY.POST_DISLIKES(postId);
          const userDislikeKey = userId
            ? REDIS_LIKE_KEY.USER_POST_DISLIKE(userId, postId)
            : `ip:${ipAddress}:post:${postId}:dislike`;

          await this.cacheManager.set(userDislikeKey, '1');
          const currentDislikes =
            (await this.cacheManager.get<number>(dislikeKey)) || 0;
          await this.cacheManager.set(dislikeKey, currentDislikes + 1);

          return {
            liked: false,
            disliked: true,
            likeCount: post.likeCount,
            dislikeCount: post.dislikeCount + 1,
          };
        } else if (!existingLike.isDislike) {
          // 이미 좋아요가 있는 경우 - 싫어요로 변경
          console.log(`[DIRECT] Converting like to dislike`);
          existingLike.isDislike = true;
          await this.postLikeRepository.save(existingLike);

          // 카운터 조정 (좋아요 -1, 싫어요 +1)
          await this.postRepository.decrement({ id: postId }, 'likeCount', 1);
          await this.postRepository.increment(
            { id: postId },
            'dislikeCount',
            1,
          );

          // Redis 캐시 업데이트
          const likeKey = REDIS_LIKE_KEY.POST_LIKES(postId);
          const dislikeKey = REDIS_LIKE_KEY.POST_DISLIKES(postId);
          const userLikeKey = userId
            ? REDIS_LIKE_KEY.USER_POST_LIKE(userId, postId)
            : `ip:${ipAddress}:post:${postId}:like`;
          const userDislikeKey = userId
            ? REDIS_LIKE_KEY.USER_POST_DISLIKE(userId, postId)
            : `ip:${ipAddress}:post:${postId}:dislike`;

          await this.cacheManager.del(userLikeKey);
          await this.cacheManager.set(userDislikeKey, '1');

          const currentLikes =
            (await this.cacheManager.get<number>(likeKey)) || 0;
          const currentDislikes =
            (await this.cacheManager.get<number>(dislikeKey)) || 0;

          if (currentLikes > 0) {
            await this.cacheManager.set(likeKey, currentLikes - 1);
          }
          await this.cacheManager.set(dislikeKey, currentDislikes + 1);

          return {
            liked: false,
            disliked: true,
            likeCount: Math.max(0, post.likeCount - 1),
            dislikeCount: post.dislikeCount + 1,
          };
        } else {
          // 이미 싫어요가 있는 경우 - 싫어요 취소
          console.log(`[DIRECT] Canceling existing dislike`);
          await this.postLikeRepository.remove(existingLike);

          // 싫어요 카운터 감소
          await this.postRepository.decrement(
            { id: postId },
            'dislikeCount',
            1,
          );

          // Redis 캐시 업데이트
          const dislikeKey = REDIS_LIKE_KEY.POST_DISLIKES(postId);
          const userDislikeKey = userId
            ? REDIS_LIKE_KEY.USER_POST_DISLIKE(userId, postId)
            : `ip:${ipAddress}:post:${postId}:dislike`;

          await this.cacheManager.del(userDislikeKey);
          const currentDislikes =
            (await this.cacheManager.get<number>(dislikeKey)) || 0;
          if (currentDislikes > 0) {
            await this.cacheManager.set(dislikeKey, currentDislikes - 1);
          }

          return {
            liked: false,
            disliked: false,
            likeCount: post.likeCount,
            dislikeCount: Math.max(0, post.dislikeCount - 1),
          };
        }
      }

      throw new Error(`Invalid action: ${action}`);
    } catch (error) {
      console.error(`[DIRECT] Error in togglePostLike:`, error);
      throw error;
    }
  }

  // 댓글 좋아요 토글 (유사하게 배치 처리 로직 적용)
  async toggleCommentLike(
    commentId: number,
    userId?: number,
    ipAddress?: string,
  ) {
    // 인증된 사용자나 IP 주소가 없으면 에러
    if (!userId && !ipAddress) {
      throw new Error('User ID or IP address is required');
    }

    // Redis에서 현재 상태 확인
    const likeKey = REDIS_LIKE_KEY.COMMENT_LIKES(commentId);
    const userLikeKey = userId
      ? REDIS_LIKE_KEY.USER_COMMENT_LIKE(userId, commentId)
      : `ip:${ipAddress}:comment:${commentId}:like`;

    // 현재 좋아요 상태 확인
    const hasLiked = (await this.cacheManager.get<string>(userLikeKey)) === '1';
    const toggleAction = hasLiked ? 'unlike' : 'like';

    // 캐시 상태 즉시 업데이트
    if (toggleAction === 'like') {
      await this.cacheManager.set(userLikeKey, '1');
      const likes = (await this.cacheManager.get<number>(likeKey)) || 0;
      await this.cacheManager.set(likeKey, likes + 1);
    } else {
      await this.cacheManager.del(userLikeKey);
      const likes = (await this.cacheManager.get<number>(likeKey)) || 0;
      if (likes > 0) {
        await this.cacheManager.set(likeKey, likes - 1);
      }
    }

    // 액션을 배치 큐에 추가
    this.addToBatch({
      userId,
      ipAddress,
      targetId: commentId,
      action: toggleAction,
      type: 'comment',
      timestamp: Date.now(),
    });

    // 즉시 임시 응답 반환 (캐시 상태 기반)
    return {
      liked: toggleAction === 'like',
      likeCount: (await this.cacheManager.get<number>(likeKey)) || 0,
    };
  }

  // 게시물 좋아요 상태 가져오기
  async getPostLikeStatus(postId: number, userId?: number, ipAddress?: string) {
    if (!userId && !ipAddress) {
      return { liked: false, disliked: false };
    }

    const userLikeKey = userId
      ? REDIS_LIKE_KEY.USER_POST_LIKE(userId, postId)
      : `ip:${ipAddress}:post:${postId}:like`;

    const userDislikeKey = userId
      ? REDIS_LIKE_KEY.USER_POST_DISLIKE(userId, postId)
      : `ip:${ipAddress}:post:${postId}:dislike`;

    const [hasLiked, hasDisliked] = await Promise.all([
      this.cacheManager.get<string>(userLikeKey),
      this.cacheManager.get<string>(userDislikeKey),
    ]);

    return {
      liked: hasLiked === '1',
      disliked: hasDisliked === '1',
    };
  }

  // 게시물 좋아요 개수 가져오기
  async getPostLikeCounts(postId: number) {
    const likeKey = REDIS_LIKE_KEY.POST_LIKES(postId);
    const dislikeKey = REDIS_LIKE_KEY.POST_DISLIKES(postId);

    const [likes, dislikes] = await Promise.all([
      this.cacheManager.get<number>(likeKey),
      this.cacheManager.get<number>(dislikeKey),
    ]);

    return {
      likes: likes || 0,
      dislikes: dislikes || 0,
    };
  }

  // 댓글 좋아요 상태 가져오기
  async getCommentLikeStatus(
    commentId: number,
    userId?: number,
    ipAddress?: string,
  ) {
    if (!userId && !ipAddress) {
      return { liked: false };
    }

    const userLikeKey = userId
      ? REDIS_LIKE_KEY.USER_COMMENT_LIKE(userId, commentId)
      : `ip:${ipAddress}:comment:${commentId}:like`;

    const hasLiked = await this.cacheManager.get<string>(userLikeKey);

    return {
      liked: hasLiked === '1',
    };
  }

  // 댓글 좋아요 개수 가져오기
  async getCommentLikeCounts(commentId: number) {
    const likeKey = REDIS_LIKE_KEY.COMMENT_LIKES(commentId);
    const likes = await this.cacheManager.get<number>(likeKey);

    return {
      likes: likes || 0,
    };
  }
}
