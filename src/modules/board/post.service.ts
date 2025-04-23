import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Post } from '../../entities/post.entity';
import * as bcrypt from 'bcrypt';
import {
  Order,
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import { PointsService } from '../points/points.service';
import { ActivityType } from '../../entities/user-activity.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    private pointsService: PointsService,
    private dataSource: DataSource,
  ) {}

  async findAll(
    boardId: number,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<Post>> {
    const {
      page = 1,
      perPage = 3,
      order = Order.DESC,
      orderKey = 'createdAt',
    } = query;

    const [items, total] = await this.postRepository.findAndCount({
      where: { board: { id: boardId } },
      relations: ['author', 'comments'],
      order: { [orderKey]: order },
      take: perPage,
      skip: (page - 1) * perPage,
    });

    return new PaginatedResponse({
      items,
      total,
      totalPages: Math.ceil(total / perPage),
      page,
      perPage,
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
    return await this.dataSource.transaction(async (manager) => {
      const posts = manager.create(Post, {
        ...postData,
        board: { id: postData.boardId },
        author: postData.author,
      });
      const post = Array.isArray(posts) ? posts[0] : posts;
      if (post.password) {
        post.password = await bcrypt.hash(post.password, 10);
      }
      const savedPost = await manager.save(Post, post);

      const postWithAuthor = await manager.findOne(Post, {
        where: { id: savedPost.id },
        relations: ['author'],
      });

      if (postWithAuthor && postWithAuthor.author && postWithAuthor.author.id) {
        await this.pointsService.recordActivityWithManager(
          manager,
          postWithAuthor.author.id,
          ActivityType.POST_CREATE,
          postWithAuthor.id,
        );
      }

      return savedPost;
    });
  }

  async update(id: number, postData: any, password?: string) {
    const post = await this.findById(id);

    // 익명 게시글인 경우 비밀번호 검증
    if (post.password) {
      if (!password || !(await bcrypt.compare(password, post.password))) {
        throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
      }
    }

    // 업데이트할 필드만 선택
    const updateData: any = {
      title: postData.title,
      content: postData.content,
    };

    // 익명 게시글인 경우 작성자명 업데이트
    if (postData.authorName !== undefined) {
      updateData.authorName = postData.authorName;
    }

    // boardId가 제공되었고 현재 게시판과 다른 경우에만 board 관계 업데이트
    if (postData.boardId && post.board.id !== postData.boardId) {
      updateData.board = { id: postData.boardId };
    }

    await this.postRepository.save({
      id,
      ...updateData,
    });

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

    await this.postRepository.softDelete(id);
  }
}
