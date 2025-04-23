import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { User } from '../../entities/user.entity';
import { PointsService } from '../points/points.service';
import { ActivityType } from '../../entities/user-activity.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    private pointsService: PointsService,
  ) {}

  async create(createPostDto: any, user: User) {
    const posts = this.postRepository.create({
      ...createPostDto,
      user,
    });
    const post = posts[0];
    await this.postRepository.save(post);

    // 포인트 시스템 연동
    await this.pointsService.recordActivity(
      user.id,
      ActivityType.POST_CREATE,
      post.id,
    );

    return post;
  }

  async incrementViewCount(postId: number, user: User) {
    const post = await this.postRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    post.viewCount = (post.viewCount || 0) + 1;
    await this.postRepository.save(post);

    // 조회수 포인트 부여 (소수점으로 계산)
    await this.pointsService.recordActivity(
      user.id,
      ActivityType.POST_VIEW,
      post.id,
    );

    return post;
  }

  async likePost(postId: number, user: User) {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['likes'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // 이미 좋아요한 경우 체크
    const existingLike = post.likes.find((like) => like.user.id === user.id);
    if (existingLike) {
      return post;
    }

    // 좋아요 추가
    const like = this.postRepository.manager.create('PostLike', {
      post: { id: postId },
      user,
    });
    await this.postRepository.manager.save(like);

    // 포인트 시스템 연동
    await this.pointsService.recordActivity(
      user.id,
      ActivityType.POST_LIKE,
      post.id,
    );

    return post;
  }
}
