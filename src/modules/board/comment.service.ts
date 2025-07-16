import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Comment } from '../../entities/comment.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
  ) {}

  async findByPostId(postId: number): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { post: { id: postId } },
      relations: [
        'author',
        'author.userLevel',
        'parent',
        'replies',
        'replies.author',
        'replies.author.userLevel',
      ],
      withDeleted: true, // 삭제된 댓글도 포함하여 조회
      order: {
        createdAt: 'ASC',
        replies: {
          createdAt: 'ASC',
        },
      },
    });
  }

  async create(commentData: any): Promise<Comment> {
    const comments = this.commentRepository.create({
      ...commentData,
      post: { id: commentData.postId },
    });
    const comment = Array.isArray(comments) ? comments[0] : comments;

    if (!comment) {
      throw new Error('Failed to create comment');
    }

    if (comment.password) {
      comment.password = await bcrypt.hash(comment.password, 10);
    }

    return this.commentRepository.save(comment);
  }

  async update(
    id: number,
    commentData: any,
    password?: string,
  ): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['author', 'author.userLevel'],
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.password) {
      if (!password || !(await bcrypt.compare(password, comment.password))) {
        throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
      }
    }

    const updateData: any = {
      content: commentData.content,
    };

    if (commentData.authorName !== undefined) {
      updateData.authorName = commentData.authorName;
    }

    await this.commentRepository.update(id, updateData);
    return this.commentRepository.findOne({
      where: { id },
      relations: ['author', 'author.userLevel'],
    });
  }

  async delete(id: number, password?: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['replies', 'parent'],
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.password) {
      if (!password || !(await bcrypt.compare(password, comment.password))) {
        throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
      }
    }

    const parentId = comment.parent?.id;

    // 모든 댓글을 softDelete로 처리 (하위 댓글 유무와 관계없이)
    await this.commentRepository.softDelete(id);

    // 부모 댓글 정리 실행
    if (parentId) {
      await this.cleanupDeletedParents(parentId);
    }
  }

  private async cleanupDeletedParents(parentId: number): Promise<void> {
    const parent = await this.commentRepository.findOne({
      where: { id: parentId },
      relations: ['parent'],
      withDeleted: true,
    });

    if (!parent) {
      return;
    }

    // soft delete되지 않은 활성 하위 댓글 수를 정확히 계산
    const activeRepliesCount = await this.commentRepository
      .createQueryBuilder('comment')
      .where('comment.parentId = :parentId', { parentId })
      .andWhere('comment.deletedAt IS NULL')
      .getCount();

    // 삭제된 댓글이고 활성 하위 댓글이 없는 경우에만 정리
    if (parent.deletedAt && activeRepliesCount === 0) {
      const grandParentId = parent.parent?.id;

      // soft delete로 안전하게 삭제
      await this.commentRepository.softDelete(parentId);

      // 조부모 댓글도 정리가 필요한지 확인
      if (grandParentId) {
        await this.cleanupDeletedParents(grandParentId);
      }
    }
  }

  async createReply(parentId: number, replyData: any): Promise<Comment> {
    const parent = await this.commentRepository.findOne({
      where: { id: parentId },
      relations: ['post'],
    });

    if (!parent) {
      throw new NotFoundException('원본 댓글을 찾을 수 없습니다.');
    }

    if (parent.deletedAt) {
      throw new NotFoundException('삭제된 댓글에는 대댓글을 달 수 없습니다.');
    }

    const replies = this.commentRepository.create({
      ...replyData,
      parent,
      post: parent.post,
    });
    const reply = Array.isArray(replies) ? replies[0] : replies;

    if (!reply) {
      throw new Error('Failed to create reply');
    }

    if (reply.password) {
      reply.password = await bcrypt.hash(reply.password, 10);
    }

    return this.commentRepository.save(reply);
  }

  async findById(id: number): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['author', 'author.userLevel', 'post', 'post.board'],
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    return comment;
  }

  async findByPostIdWithDeleted(postId: number): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { post: { id: postId } },
      relations: [
        'author',
        'author.userLevel',
        'parent',
        'replies',
        'replies.author',
        'replies.author.userLevel',
      ],
      withDeleted: true,
      order: {
        createdAt: 'ASC',
        replies: {
          createdAt: 'ASC',
        },
      },
    });
  }

  async forceDelete(id: number): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    await this.commentRepository.delete(id);
  }

  async restore(id: number): Promise<Comment> {
    const result = await this.commentRepository.restore(id);

    if (result.affected === 0) {
      throw new NotFoundException('복구할 댓글을 찾을 수 없습니다.');
    }

    return this.findById(id);
  }

  async findBestCommentsByPostId(postId: number): Promise<Comment[]> {
    return this.commentRepository.find({
      where: {
        post: { id: postId },
        parent: null, // 최상위 댓글만
        likeCount: MoreThanOrEqual(1), // 좋아요 10개 이상
      },
      relations: [
        'author',
        'author.userLevel',
        'replies',
        'replies.author',
        'replies.author.userLevel',
      ],
      order: { likeCount: 'DESC' }, // 좋아요순 내림차순
      take: 3, // 최대 3개
    });
  }
}
