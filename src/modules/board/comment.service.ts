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
    // 한 번의 쿼리로 해당 게시글의 모든 댓글을 가져옴
    const allComments = await this.commentRepository.find({
      where: {
        post: { id: postId },
      },
      relations: ['author', 'parent'],
      order: { createdAt: 'ASC' },
    });

    // 댓글 트리 구조 만들기
    const commentMap = new Map<number, Comment>();
    const rootComments: Comment[] = [];

    // 먼저 모든 댓글을 Map에 저장
    allComments.forEach((comment) => {
      comment.replies = []; // replies 배열 초기화
      commentMap.set(comment.id, comment);
    });

    // 부모-자식 관계 설정
    allComments.forEach((comment) => {
      if (comment.parent) {
        // 부모 댓글이 있으면 부모의 replies에 추가
        const parentComment = commentMap.get(comment.parent.id);
        if (parentComment) {
          parentComment.replies.push(comment);
        }
      } else {
        // 최상위 댓글이면 결과 배열에 추가
        rootComments.push(comment);
      }
    });

    return rootComments;
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

    await this.commentRepository.update(id, commentData);
    return this.commentRepository.findOne({
      where: { id },
      relations: ['author'],
    });
  }

  async delete(id: number, password?: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['replies'],
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.password) {
      if (!password || !(await bcrypt.compare(password, comment.password))) {
        throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
      }
    }

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
