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
  userId: number;
  targetId: number;
  action: 'like' | 'unlike' | 'dislike' | 'undislike';
  type: 'post' | 'comment';
  timestamp: number;
}

@Injectable()
export class LikesService {
  // 배치 처리를 위한 메모리 저장소
  private pendingLikes: Map<string, PendingLikeAction> = new Map();
  // 배치 처리 간격 (밀리초) - 1초로 단축
  private readonly BATCH_INTERVAL = 1000; // 1초
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

  // 1초마다 배치 처리 실행 (성능 개선)
  @Interval(1000)
  async processBatch() {
    if (this.pendingLikes.size === 0) return;

    console.log(`Processing batch of ${this.pendingLikes.size} like actions`);

    // 현재 배치에 있는 항목들 복사
    const batch = Array.from(this.pendingLikes.values());
    // 배치 초기화
    this.pendingLikes.clear();

    // 배치를 더 작은 청크로 나누어 병렬 처리
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < batch.length; i += chunkSize) {
      chunks.push(batch.slice(i, i + chunkSize));
    }

    // 각 청크를 병렬로 처리
    await Promise.all(chunks.map((chunk) => this.processChunk(chunk)));
  }

  // 청크 단위로 병렬 처리
  private async processChunk(chunk: PendingLikeAction[]) {
    const jobs = chunk.map((item, index) => {
      const actionType = item.action.startsWith('un')
        ? item.action.substring(2)
        : item.action;

      const isRemoval = item.action.startsWith('un');

      console.log(
        `Adding job to queue: ${actionType} (removal: ${isRemoval}) for ${item.type}:${item.targetId}, user:${item.userId}`,
      );

      return this.likesQueue.add(
        'processLike',
        {
          userId: item.userId,
          targetId: item.targetId,
          action: actionType as 'like' | 'dislike',
          isRemoval: isRemoval,
          type: item.type,
        },
        {
          // 모든 액션이 순차적으로 처리되도록 고유한 jobId 생성
          jobId: `${item.type}:${item.targetId}:${item.userId}:${item.action}:${item.timestamp}`,
          // 작업 우선순위 설정 (더 최근 것이 높은 우선순위) - BullMQ 범위내로 조정
          priority: Math.min(1000 + index, 2097152),
        },
      );
    });

    await Promise.all(jobs);
  }

  // 좋아요 액션을 배치 큐에 추가
  private addToBatch(action: PendingLikeAction): void {
    // 유형, 타겟ID, 사용자ID, 실제 액션을 포함한 고유 키 생성
    // like와 unlike를 구분하여 각각 처리할 수 있도록 함
    const key = `${action.type}:${action.targetId}:${action.userId}:${action.action}:${Date.now()}`;

    // 더 자세한 로깅
    console.log(
      `Adding action to batch with key: ${key}, action: ${action.action}`,
    );

    // 고유한 키로 모든 액션을 순차적으로 처리
    this.pendingLikes.set(key, {
      ...action,
      timestamp: Date.now(),
    });

    // 현재 배치 크기 로그
    console.log(`Current batch size: ${this.pendingLikes.size}`);
  }

  // 포스트 좋아요 상태 토글 - Redis 우선 접근으로 최적화
  async togglePostLike(
    postId: number,
    action: 'like' | 'dislike',
    userId: number,
  ) {
    console.log(
      `[OPTIMIZED] togglePostLike - postId: ${postId}, action: ${action}, userId: ${userId}`,
    );

    // 로그인한 사용자만 허용
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Redis 캐시 키 생성
      const userLikeKey = REDIS_LIKE_KEY.USER_POST_LIKE(userId, postId);
      const userDislikeKey = REDIS_LIKE_KEY.USER_POST_DISLIKE(userId, postId);
      const likeCountKey = REDIS_LIKE_KEY.POST_LIKES(postId);
      const dislikeCountKey = REDIS_LIKE_KEY.POST_DISLIKES(postId);

      // 현재 상태를 Redis에서 확인하고 필요시 캐시 초기화
      const [hasLiked, hasDisliked, cacheData] = await Promise.all([
        this.cacheManager.get<string>(userLikeKey),
        this.cacheManager.get<string>(userDislikeKey),
        this.ensureCacheInitialized(postId),
      ]);

      const isCurrentlyLiked = hasLiked === '1';
      const isCurrentlyDisliked = hasDisliked === '1';
      let likes = cacheData.likes;
      let dislikes = cacheData.dislikes;

      console.log(
        `[OPTIMIZED] Current state - liked: ${isCurrentlyLiked}, disliked: ${isCurrentlyDisliked}, likes: ${likes}, dislikes: ${dislikes}`,
      );

      // Redis 파이프라인을 활용한 성능 최적화
      let newLiked = false;
      let newDisliked = false;
      let batchAction: 'like' | 'unlike' | 'dislike' | 'undislike';
      const pipeline = [];

      if (action === 'like') {
        if (isCurrentlyLiked) {
          // 이미 좋아요 상태 → 좋아요 취소
          newLiked = false;
          newDisliked = false;
          likes = Math.max(0, likes - 1);
          batchAction = 'unlike';
          pipeline.push(this.cacheManager.del(userLikeKey));
        } else if (isCurrentlyDisliked) {
          // 싫어요 상태 → 좋아요로 변경
          newLiked = true;
          newDisliked = false;
          likes = likes + 1;
          dislikes = Math.max(0, dislikes - 1);
          batchAction = 'like';
          pipeline.push(
            this.cacheManager.set(userLikeKey, '1'),
            this.cacheManager.del(userDislikeKey),
          );
        } else {
          // 중립 상태 → 좋아요
          newLiked = true;
          newDisliked = false;
          likes = likes + 1;
          batchAction = 'like';
          pipeline.push(this.cacheManager.set(userLikeKey, '1'));
        }
      } else if (action === 'dislike') {
        if (isCurrentlyDisliked) {
          // 이미 싫어요 상태 → 싫어요 취소
          newLiked = false;
          newDisliked = false;
          dislikes = Math.max(0, dislikes - 1);
          batchAction = 'undislike';
          pipeline.push(this.cacheManager.del(userDislikeKey));
        } else if (isCurrentlyLiked) {
          // 좋아요 상태 → 싫어요로 변경
          newLiked = false;
          newDisliked = true;
          likes = Math.max(0, likes - 1);
          dislikes = dislikes + 1;
          batchAction = 'dislike';
          pipeline.push(
            this.cacheManager.del(userLikeKey),
            this.cacheManager.set(userDislikeKey, '1'),
          );
        } else {
          // 중립 상태 → 싫어요
          newLiked = false;
          newDisliked = true;
          dislikes = dislikes + 1;
          batchAction = 'dislike';
          pipeline.push(this.cacheManager.set(userDislikeKey, '1'));
        }
      } else {
        throw new Error(`Invalid action: ${action}`);
      }

      // 카운트 캐시 업데이트를 파이프라인에 추가
      pipeline.push(
        this.cacheManager.set(likeCountKey, likes),
        this.cacheManager.set(dislikeCountKey, dislikes),
      );

      // 모든 Redis 작업을 병렬로 실행
      await Promise.all(pipeline);

      // 배치 처리를 위해 액션 추가 (비동기)
      setImmediate(() => {
        this.addToBatch({
          userId,
          targetId: postId,
          action: batchAction,
          type: 'post',
          timestamp: Date.now(),
        });
      });

      console.log(
        `[OPTIMIZED] Updated state - liked: ${newLiked}, disliked: ${newDisliked}, likes: ${likes}, dislikes: ${dislikes}`,
      );

      // 클라이언트가 기대하는 형태로 응답 반환
      return {
        // 하위 호환성을 위한 플랫 구조
        liked: newLiked,
        disliked: newDisliked,
        likeCount: likes,
        dislikeCount: dislikes,
        // 클라이언트가 기대하는 중첩 구조
        status: {
          liked: newLiked,
          disliked: newDisliked,
        },
        counts: {
          likes: likes,
          dislikes: dislikes,
        },
      };
    } catch (error) {
      console.error(`[OPTIMIZED] Error in togglePostLike:`, error);
      throw error;
    }
  }

  // 댓글 좋아요 토글 - Redis 우선 접근으로 최적화
  async toggleCommentLike(commentId: number, userId: number) {
    console.log(
      `[OPTIMIZED] toggleCommentLike - commentId: ${commentId}, userId: ${userId}`,
    );

    // 로그인한 사용자만 허용
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Redis 캐시 키 생성
      const likeCountKey = REDIS_LIKE_KEY.COMMENT_LIKES(commentId);
      const userLikeKey = REDIS_LIKE_KEY.USER_COMMENT_LIKE(userId, commentId);

      // 현재 상태를 Redis에서 확인
      const [hasLiked, currentLikes] = await Promise.all([
        this.cacheManager.get<string>(userLikeKey),
        this.cacheManager.get<number>(likeCountKey),
      ]);

      const isCurrentlyLiked = hasLiked === '1';
      let likes = currentLikes || 0;

      // 캐시가 비어있으면 DB에서 초기화 (댓글은 좋아요만 있음)
      if (currentLikes === undefined) {
        console.log(`[CACHE_INIT] Initializing comment cache for ${commentId}`);
        const comment = await this.commentRepository.findOne({
          where: { id: commentId },
          select: ['likeCount'],
        });
        if (comment) {
          likes = comment.likeCount || 0;
          await this.cacheManager.set(likeCountKey, likes);
        }
      }

      console.log(
        `[OPTIMIZED] Comment current state - liked: ${isCurrentlyLiked}, likes: ${likes}`,
      );

      let newLiked = false;
      let batchAction: 'like' | 'unlike';

      if (isCurrentlyLiked) {
        // 이미 좋아요 상태 → 좋아요 취소
        newLiked = false;
        likes = Math.max(0, likes - 1);
        batchAction = 'unlike';
        await this.cacheManager.del(userLikeKey);
      } else {
        // 중립 상태 → 좋아요
        newLiked = true;
        likes = likes + 1;
        batchAction = 'like';
        await this.cacheManager.set(userLikeKey, '1');
      }

      // 카운트 캐시 업데이트
      await this.cacheManager.set(likeCountKey, likes);

      // 배치 처리를 위해 액션 추가 (비동기)
      setImmediate(() => {
        this.addToBatch({
          userId,
          targetId: commentId,
          action: batchAction,
          type: 'comment',
          timestamp: Date.now(),
        });
      });

      console.log(
        `[OPTIMIZED] Comment updated state - liked: ${newLiked}, likes: ${likes}`,
      );

      // 즉시 응답 반환
      return {
        liked: newLiked,
        likeCount: likes,
      };
    } catch (error) {
      console.error(`[OPTIMIZED] Error in toggleCommentLike:`, error);
      throw error;
    }
  }

  // 게시물 좋아요 상태 가져오기
  async getPostLikeStatus(postId: number, userId: number) {
    if (!userId) {
      return { liked: false, disliked: false };
    }

    const userLikeKey = REDIS_LIKE_KEY.USER_POST_LIKE(userId, postId);
    const userDislikeKey = REDIS_LIKE_KEY.USER_POST_DISLIKE(userId, postId);

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
    // 캐시가 없으면 DB에서 초기화
    const cacheData = await this.ensureCacheInitialized(postId);

    return {
      likes: cacheData.likes,
      dislikes: cacheData.dislikes,
    };
  }

  // 댓글 좋아요 상태 가져오기
  async getCommentLikeStatus(commentId: number, userId: number) {
    if (!userId) {
      return { liked: false };
    }

    const userLikeKey = REDIS_LIKE_KEY.USER_COMMENT_LIKE(userId, commentId);

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

  // Redis 캐시 초기화 메서드 추가
  private async ensureCacheInitialized(postId: number) {
    const likeCountKey = REDIS_LIKE_KEY.POST_LIKES(postId);
    const dislikeCountKey = REDIS_LIKE_KEY.POST_DISLIKES(postId);

    // 캐시가 비어있는지 확인
    const [cachedLikes, cachedDislikes] = await Promise.all([
      this.cacheManager.get<number>(likeCountKey),
      this.cacheManager.get<number>(dislikeCountKey),
    ]);

    // 캐시가 비어있으면 DB에서 로드
    if (cachedLikes === undefined || cachedDislikes === undefined) {
      console.log(`[CACHE_INIT] Initializing cache for post ${postId}`);

      const post = await this.postRepository.findOne({
        where: { id: postId },
        select: ['likeCount', 'dislikeCount'],
      });

      if (post) {
        await Promise.all([
          this.cacheManager.set(likeCountKey, post.likeCount || 0),
          this.cacheManager.set(dislikeCountKey, post.dislikeCount || 0),
        ]);

        return {
          likes: post.likeCount || 0,
          dislikes: post.dislikeCount || 0,
        };
      }
    }

    return {
      likes: cachedLikes || 0,
      dislikes: cachedDislikes || 0,
    };
  }
}
