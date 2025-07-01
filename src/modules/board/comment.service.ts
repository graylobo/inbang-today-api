import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      relations: ['author', 'parent', 'replies', 'replies.author'],
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
      relations: ['author'],
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
      relations: ['author'],
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

    if (comment.replies?.length > 0) {
      await this.commentRepository.update(id, {
        content: '삭제된 댓글입니다.',
        author: null,
        authorName: null,
        password: null,
      });
    } else {
      await this.commentRepository.delete(id);
    }

    // 부모 댓글이 있고, 현재 댓글이 실제로 삭제된 경우 부모 댓글들도 정리
    if (parentId && comment.replies?.length === 0) {
      await this.cleanupDeletedParents(parentId);
    }
  }

  /**
   * 삭제된 상태의 부모 댓글들을 재귀적으로 정리
   * 하위 댓글이 모두 삭제된 "삭제된 댓글입니다" 상태의 댓글들을 실제로 삭제
   */
  private async cleanupDeletedParents(parentId: number): Promise<void> {
    const parent = await this.commentRepository.findOne({
      where: { id: parentId },
      relations: ['replies', 'parent'],
    });

    if (!parent) {
      return;
    }

    // 부모가 "삭제된 댓글입니다" 상태이고, 하위 댓글이 없는 경우
    if (
      parent.content === '삭제된 댓글입니다.' &&
      !parent.author &&
      (!parent.replies || parent.replies.length === 0)
    ) {
      const grandParentId = parent.parent?.id;
      await this.commentRepository.delete(parentId);

      // 조부모 댓글도 확인
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
      relations: ['author', 'post', 'post.board'],
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    return comment;
  }
}
