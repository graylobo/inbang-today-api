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
  action: 'like' | 'unlike';
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
    const { userId, ipAddress, targetId, action, type } = job.data;

    try {
      if (type === 'post') {
        await this.handlePostLike(userId, ipAddress, targetId, action);
      } else {
        await this.handleCommentLike(userId, ipAddress, targetId, action);
      }
    } catch (error) {
      console.error(`Failed to process ${type} like:`, error);
      throw error;
    }
  }

  private async handlePostLike(
    userId: number | null,
    ipAddress: string | null,
    postId: number,
    action: 'like' | 'unlike',
  ) {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    const likeKey = REDIS_LIKE_KEY.POST_LIKES(postId);
    const userLikeKey = userId
      ? REDIS_LIKE_KEY.USER_POST_LIKE(userId, postId)
      : `ip:${ipAddress}:post:${postId}:like`;

    if (action === 'like') {
      // 좋아요 엔티티 생성
      const like = this.postLikeRepository.create({
        post,
        user: userId ? { id: userId } : null,
        ipAddress,
      });
      await this.postLikeRepository.save(like);

      // Redis 캐시 업데이트
      await this.cacheManager.set(userLikeKey, '1');
      const currentLikes = (await this.cacheManager.get<number>(likeKey)) || 0;
      await this.cacheManager.set(likeKey, currentLikes + 1);

      // DB 카운터 업데이트
      await this.postRepository.increment({ id: postId }, 'likeCount', 1);
    } else {
      // 좋아요 제거
      await this.postLikeRepository.delete({
        post: { id: postId },
        ...(userId ? { user: { id: userId } } : { ipAddress }),
      });

      // Redis 캐시 업데이트
      await this.cacheManager.del(userLikeKey);
      const currentLikes = (await this.cacheManager.get<number>(likeKey)) || 0;
      if (currentLikes > 0) {
        await this.cacheManager.set(likeKey, currentLikes - 1);
      }

      // DB 카운터 업데이트
      await this.postRepository.decrement({ id: postId }, 'likeCount', 1);
    }
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
      // 좋아요 엔티티 생성
      const like = this.commentLikeRepository.create({
        comment,
        user: userId ? { id: userId } : null,
        ipAddress,
      });
      await this.commentLikeRepository.save(like);

      // Redis 캐시 업데이트
      await this.cacheManager.set(userLikeKey, '1');
      const currentLikes = (await this.cacheManager.get<number>(likeKey)) || 0;
      await this.cacheManager.set(likeKey, currentLikes + 1);

      // DB 카운터 업데이트
      await this.commentRepository.increment({ id: commentId }, 'likeCount', 1);
    } else {
      // 좋아요 제거
      await this.commentLikeRepository.delete({
        comment: { id: commentId },
        ...(userId ? { user: { id: userId } } : { ipAddress }),
      });

      // Redis 캐시 업데이트
      await this.cacheManager.del(userLikeKey);
      const currentLikes = (await this.cacheManager.get<number>(likeKey)) || 0;
      if (currentLikes > 0) {
        await this.cacheManager.set(likeKey, currentLikes - 1);
      }

      // DB 카운터 업데이트
      await this.commentRepository.decrement({ id: commentId }, 'likeCount', 1);
    }
  }
}
