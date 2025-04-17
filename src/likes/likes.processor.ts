import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../entities/post.entity';
import { Comment } from '../entities/comment.entity';
import { PostLike } from '../entities/post-like.entity';
import { CommentLike } from '../entities/comment-like.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { REDIS_LIKE_KEY } from '../config/redis.config';

interface LikeJobData {
  userId: number | null;
  ipAddress: string | null;
  targetId: number;
  action: 'like' | 'dislike';
  isRemoval: boolean;
  type: 'post' | 'comment';
}

@Processor('likes')
export class LikesProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(PostLike)
    private readonly postLikeRepository: Repository<PostLike>,
    @InjectRepository(CommentLike)
    private readonly commentLikeRepository: Repository<CommentLike>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {
    super();
  }

  async process(job: Job<LikeJobData>) {
    const { userId, ipAddress, targetId, action, isRemoval, type } = job.data;

    try {
      if (type === 'post') {
        if (action === 'like') {
          await this.handlePostLike(
            userId,
            ipAddress,
            targetId,
            isRemoval ? 'unlike' : 'like',
          );
        } else if (action === 'dislike') {
          if (isRemoval) {
            await this.handlePostDislikeRemoval(userId, ipAddress, targetId);
          } else {
            await this.handlePostDislike(userId, ipAddress, targetId);
          }
        }
      } else if (type === 'comment') {
        await this.handleCommentLike(
          userId,
          ipAddress,
          targetId,
          isRemoval ? 'unlike' : 'like',
        );
      }
    } catch (error) {
      console.error(
        `Failed to process ${type} ${action} (isRemoval: ${isRemoval}):`,
        error,
      );
      throw error;
    }
  }

  private async handlePostLike(
    userId: number | null,
    ipAddress: string | null,
    postId: number,
    action: 'like' | 'unlike',
  ) {
    console.log(
      `Starting handlePostLike: ${action} for post:${postId}, user:${userId || ipAddress}`,
    );

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    const likeKey = REDIS_LIKE_KEY.POST_LIKES(postId);
    const userLikeKey = userId
      ? REDIS_LIKE_KEY.USER_POST_LIKE(userId, postId)
      : `ip:${ipAddress}:post:${postId}:like`;

    // Like/Unlike 작업 수행
    if (action === 'like') {
      // 엔티티가 있는지 확인 (isDislike 상태 무관)
      const query = {
        where: {
          post: { id: postId },
          ...(userId ? { user: { id: userId } } : { ipAddress }),
        },
      };

      console.log(`Checking existing like with query:`, JSON.stringify(query));

      const existingLike = await this.postLikeRepository.findOne(query);
      console.log(`Existing like found:`, existingLike ? 'YES' : 'NO');

      if (!existingLike) {
        // 엔티티가 없으면 새로 생성
        console.log(
          `Creating new like record for post:${postId}, user:${userId || ipAddress}`,
        );

        const like = this.postLikeRepository.create({
          post,
          user: userId ? { id: userId } : null,
          ipAddress,
          isDislike: false,
        });

        const savedLike = await this.postLikeRepository.save(like);
        console.log(`Like created successfully, ID: ${savedLike.id}`);

        // DB 카운터 업데이트
        await this.postRepository.increment({ id: postId }, 'likeCount', 1);
        console.log(`Incremented like count for post ${postId}`);
      } else if (existingLike.isDislike) {
        // 싫어요가 있는 경우 좋아요로 변경
        console.log(
          `Converting dislike to like for post:${postId}, user:${userId || ipAddress}`,
        );

        existingLike.isDislike = false;
        await this.postLikeRepository.save(existingLike);

        // 싫어요->좋아요 전환 시 카운터 조정
        await this.postRepository.increment({ id: postId }, 'likeCount', 1);
        await this.postRepository.decrement({ id: postId }, 'dislikeCount', 1);
      } else {
        console.log(`Like already exists, no action needed`);
      }

      // Redis 캐시 업데이트
      console.log(`Updating Redis cache: Setting ${userLikeKey} to 1`);
      await this.cacheManager.set(userLikeKey, '1');

      // 좋아요 카운트 업데이트 (Redis에서 현재 값 확인 후 설정)
      const currentLikes = (await this.cacheManager.get<number>(likeKey)) || 0;
      await this.cacheManager.set(likeKey, currentLikes + 1);
      console.log(`Updated Redis like count to ${currentLikes + 1}`);
    } else {
      // 좋아요 취소 로직
      console.log(
        `Attempting to unlike post:${postId} for user:${userId || ipAddress}`,
      );

      // 좋아요 엔티티가 있는지 확인 (싫어요는 제외)
      const query = {
        where: {
          post: { id: postId },
          ...(userId ? { user: { id: userId } } : { ipAddress }),
          isDislike: false,
        },
      };

      console.log(`Checking existing like with query:`, JSON.stringify(query));

      const existingLike = await this.postLikeRepository.findOne(query);
      console.log(`Like to remove found:`, existingLike ? 'YES' : 'NO');

      if (existingLike) {
        try {
          // 좋아요 엔티티 제거
          console.log(`Removing like entity with ID: ${existingLike.id}`);
          await this.postLikeRepository.remove(existingLike);
          console.log(`Like entity successfully removed`);

          // DB 카운터 업데이트
          await this.postRepository.decrement({ id: postId }, 'likeCount', 1);
          console.log(`Decremented like count for post ${postId}`);
        } catch (error) {
          console.error(`Error removing like entity:`, error);
        }
      } else {
        console.log(`No like entity found to remove`);
      }

      // Redis 캐시 업데이트
      console.log(`Removing like from Redis cache: Deleting ${userLikeKey}`);
      await this.cacheManager.del(userLikeKey);

      // 좋아요 카운트 업데이트 (Redis에서 현재 값 확인 후 설정)
      const currentLikes = (await this.cacheManager.get<number>(likeKey)) || 0;
      if (currentLikes > 0) {
        await this.cacheManager.set(likeKey, currentLikes - 1);
        console.log(`Updated Redis like count to ${currentLikes - 1}`);
      }
    }

    console.log(`Completed handlePostLike: ${action} for post:${postId}`);
  }

  private async handlePostDislike(
    userId: number | null,
    ipAddress: string | null,
    postId: number,
  ) {
    console.log(
      `Starting handlePostDislike for post:${postId}, user:${userId || ipAddress}`,
    );

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    const dislikeKey = REDIS_LIKE_KEY.POST_DISLIKES(postId);
    const userDislikeKey = userId
      ? REDIS_LIKE_KEY.USER_POST_DISLIKE(userId, postId)
      : `ip:${ipAddress}:post:${postId}:dislike`;

    // 엔티티가 있는지 확인 (타입 무관)
    const query = {
      where: {
        post: { id: postId },
        ...(userId ? { user: { id: userId } } : { ipAddress }),
      },
    };

    console.log(
      `Checking existing like/dislike with query:`,
      JSON.stringify(query),
    );

    const existingLike = await this.postLikeRepository.findOne(query);
    console.log(
      `Existing entity found:`,
      existingLike ? `YES (isDislike: ${existingLike.isDislike})` : 'NO',
    );

    if (existingLike) {
      try {
        // 좋아요에서 싫어요로 전환된 경우 카운터 조정
        if (!existingLike.isDislike) {
          console.log(`Converting like to dislike for post:${postId}`);
          await this.postRepository.decrement({ id: postId }, 'likeCount', 1);
          await this.postRepository.increment(
            { id: postId },
            'dislikeCount',
            1,
          );
        } else {
          console.log(
            `Entity is already a dislike, no counter adjustment needed`,
          );
        }

        // 엔티티 업데이트
        existingLike.isDislike = true;
        const savedDislike = await this.postLikeRepository.save(existingLike);
        console.log(`Updated to dislike, ID: ${savedDislike.id}`);
      } catch (error) {
        console.error(`Error updating like entity to dislike:`, error);
      }
    } else {
      // 새로운 싫어요 엔티티 생성
      try {
        console.log(`Creating new dislike for post:${postId}`);
        const dislike = this.postLikeRepository.create({
          post,
          user: userId ? { id: userId } : null,
          ipAddress,
          isDislike: true,
        });

        const savedDislike = await this.postLikeRepository.save(dislike);
        console.log(`Dislike created successfully, ID: ${savedDislike.id}`);

        // DB 카운터 업데이트
        await this.postRepository.increment({ id: postId }, 'dislikeCount', 1);
        console.log(`Incremented dislike count for post ${postId}`);
      } catch (error) {
        console.error(`Error creating dislike entity:`, error);
      }
    }

    // Redis 캐시 업데이트
    console.log(`Updating Redis cache: Setting ${userDislikeKey} to 1`);
    await this.cacheManager.set(userDislikeKey, '1');

    // 싫어요 카운트 업데이트
    const currentDislikes =
      (await this.cacheManager.get<number>(dislikeKey)) || 0;
    await this.cacheManager.set(dislikeKey, currentDislikes + 1);
    console.log(`Updated Redis dislike count to ${currentDislikes + 1}`);

    console.log(`Completed handlePostDislike for post:${postId}`);
  }

  private async handlePostDislikeRemoval(
    userId: number | null,
    ipAddress: string | null,
    postId: number,
  ) {
    console.log(
      `Starting handlePostDislikeRemoval for post:${postId}, user:${userId || ipAddress}`,
    );

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    const dislikeKey = REDIS_LIKE_KEY.POST_DISLIKES(postId);
    const userDislikeKey = userId
      ? REDIS_LIKE_KEY.USER_POST_DISLIKE(userId, postId)
      : `ip:${ipAddress}:post:${postId}:dislike`;

    // 싫어요 엔티티가 있는지 확인
    const query = {
      where: {
        post: { id: postId },
        ...(userId ? { user: { id: userId } } : { ipAddress }),
        isDislike: true,
      },
    };

    console.log(`Checking existing dislike with query:`, JSON.stringify(query));

    const existingLike = await this.postLikeRepository.findOne(query);
    console.log(`Dislike to remove found:`, existingLike ? 'YES' : 'NO');

    // 있는 경우에만 싫어요 제거
    if (existingLike) {
      try {
        console.log(`Removing dislike entity with ID: ${existingLike.id}`);
        await this.postLikeRepository.remove(existingLike);
        console.log(`Dislike entity successfully removed`);

        // DB 카운터 업데이트
        await this.postRepository.decrement({ id: postId }, 'dislikeCount', 1);
        console.log(`Decremented dislike count for post ${postId}`);
      } catch (error) {
        console.error(`Error removing dislike entity:`, error);
      }
    } else {
      console.log(`No dislike entity found to remove`);
    }

    // Redis 캐시 업데이트
    console.log(
      `Removing dislike from Redis cache: Deleting ${userDislikeKey}`,
    );
    await this.cacheManager.del(userDislikeKey);

    // 싫어요 카운트 업데이트
    const currentDislikes =
      (await this.cacheManager.get<number>(dislikeKey)) || 0;
    if (currentDislikes > 0) {
      await this.cacheManager.set(dislikeKey, currentDislikes - 1);
      console.log(`Updated Redis dislike count to ${currentDislikes - 1}`);
    }

    console.log(`Completed handlePostDislikeRemoval for post:${postId}`);
  }

  private async handleCommentLike(
    userId: number | null,
    ipAddress: string | null,
    commentId: number,
    action: 'like' | 'unlike',
  ) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });
    if (!comment) throw new Error('Comment not found');

    const likeKey = REDIS_LIKE_KEY.COMMENT_LIKES(commentId);
    const userLikeKey = userId
      ? REDIS_LIKE_KEY.USER_COMMENT_LIKE(userId, commentId)
      : `ip:${ipAddress}:comment:${commentId}:like`;

    if (action === 'like') {
      // 이미 좋아요 엔티티가 있는지 확인
      const existingLike = await this.commentLikeRepository.findOne({
        where: {
          comment: { id: commentId },
          ...(userId ? { user: { id: userId } } : { ipAddress }),
        },
      });

      // 없는 경우에만 좋아요 엔티티 생성
      if (!existingLike) {
        const like = this.commentLikeRepository.create({
          comment,
          user: userId ? { id: userId } : null,
          ipAddress,
        });
        await this.commentLikeRepository.save(like);

        // DB 카운터 업데이트
        await this.commentRepository.increment(
          { id: commentId },
          'likeCount',
          1,
        );
      }

      // Redis 캐시 업데이트
      await this.cacheManager.set(userLikeKey, '1');
      const currentLikes = (await this.cacheManager.get<number>(likeKey)) || 0;
      await this.cacheManager.set(likeKey, currentLikes + 1);
    } else {
      // 좋아요 엔티티가 있는지 확인
      const existingLike = await this.commentLikeRepository.findOne({
        where: {
          comment: { id: commentId },
          ...(userId ? { user: { id: userId } } : { ipAddress }),
        },
      });

      // 있는 경우에만 좋아요 제거
      if (existingLike) {
        await this.commentLikeRepository.remove(existingLike);

        // DB 카운터 업데이트
        await this.commentRepository.decrement(
          { id: commentId },
          'likeCount',
          1,
        );
      }

      // Redis 캐시 업데이트
      await this.cacheManager.del(userLikeKey);
      const currentLikes = (await this.cacheManager.get<number>(likeKey)) || 0;
      if (currentLikes > 0) {
        await this.cacheManager.set(likeKey, currentLikes - 1);
      }
    }
  }
}
