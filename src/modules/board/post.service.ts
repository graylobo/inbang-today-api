import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}

  async findAll(boardId: number): Promise<Post[]> {
    return this.postRepository.find({
      where: { board: { id: boardId } },
      relations: ['author', 'comments'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: [
        'author',
        'board',
        'comments',
        'comments.author',
        'comments.replies',
      ],
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    // 조회수 업데이트를 즉시 실행하고 결과를 기다림
    await this.postRepository.increment({ id }, 'viewCount', 1);
    post.viewCount += 1; // 현재 객체도 업데이트

    return post;
  }

  async create(postData: any) {
    const posts = this.postRepository.create({
      ...postData,
      board: { id: postData.boardId },
    });

    // 익명 게시글인 경우 비밀번호 해시
    const post = Array.isArray(posts) ? posts[0] : posts;
    if (post.password) {
      post.password = await bcrypt.hash(post.password, 10);
    }

    return this.postRepository.save(post);
  }

  async update(id: number, postData: any, password?: string) {
    const post = await this.findById(id);

    // 익명 게시글인 경우 비밀번호 검증
    if (post.password) {
      if (!password || !(await bcrypt.compare(password, post.password))) {
        throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
      }
    }

    await this.postRepository.update(id, postData);
    return this.findById(id);
  }

  async delete(id: number, password?: string): Promise<void> {
    const post = await this.findById(id);

    // 익명 게시글인 경우 비밀번호 검증
    if (post.password) {
      if (!password || !(await bcrypt.compare(password, post.password))) {
        throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
      }
    }

    await this.postRepository.delete(id);
  }
}
