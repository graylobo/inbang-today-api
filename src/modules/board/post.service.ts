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
      perPage = 30,
      order = Order.DESC,
      orderKey = 'createdAt',
    } = query;

    // 성능 최적화: LEFT JOIN을 사용하여 댓글 수를 효율적으로 계산
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('author.userLevel', 'userLevel')
      .leftJoin(
        'comment',
        'comment',
        'comment.postId = post.id AND comment.deletedAt IS NULL',
      )
      .select([
        'post.id',
        'post.title',
        'post.authorName',
        'post.ipAddress',
        'post.createdAt',
        'post.viewCount',
        'post.isNotice',
        'post.noticeOrder',
        'author.id',
        'author.name',
        'author.profileImage',
        'userLevel.level',
      ])
      .addSelect('COUNT(comment.id)', 'commentCount')
      .where('post.boardId = :boardId', { boardId })
      .groupBy('post.id, author.id, userLevel.id')
      .orderBy('post.isNotice', 'DESC')
      .addOrderBy('post.noticeOrder', 'ASC')
      .addOrderBy(`post.${orderKey}`, order.toUpperCase() as 'ASC' | 'DESC')
      .offset((page - 1) * perPage)
      .limit(perPage);

    const [items, total] = await Promise.all([
      queryBuilder.getRawAndEntities(),
      this.postRepository.count({ where: { board: { id: boardId } } }),
    ]);

    // 댓글 수를 포함한 게시글 데이터 구성
    const postsWithComments = items.entities.map((post, index) => {
      const commentCount = parseInt(items.raw[index].commentCount) || 0;
      return {
        ...post,
        comments: new Array(commentCount).fill({ id: 0 }), // UI 호환성을 위한 배열
      };
    });

    return new PaginatedResponse({
      items: postsWithComments,
      total,
      totalPages: Math.ceil(total / perPage),
      page,
      perPage,
    });
  }

  async findAllBySlug(
    slug: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<Post>> {
    const {
      page = 1,
      perPage = 30,
      order = Order.DESC,
      orderKey = 'createdAt',
    } = query;

    // 성능 최적화: LEFT JOIN을 사용하여 댓글 수를 효율적으로 계산
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('author.userLevel', 'userLevel')
      .leftJoin('post.board', 'board')
      .leftJoin(
        'comment',
        'comment',
        'comment.postId = post.id AND comment.deletedAt IS NULL',
      )
      .select([
        'post.id',
        'post.title',
        'post.authorName',
        'post.ipAddress',
        'post.createdAt',
        'post.viewCount',
        'post.isNotice',
        'post.noticeOrder',
        'author.id',
        'author.name',
        'author.profileImage',
        'userLevel.level',
      ])
      .addSelect('COUNT(comment.id)', 'commentCount')
      .where('board.slug = :slug', { slug })
      .groupBy('post.id, author.id, userLevel.id')
      .orderBy('post.isNotice', 'DESC')
      .addOrderBy('post.noticeOrder', 'ASC')
      .addOrderBy(`post.${orderKey}`, order.toUpperCase() as 'ASC' | 'DESC')
      .offset((page - 1) * perPage)
      .limit(perPage);

    const [items, totalCount] = await Promise.all([
      queryBuilder.getRawAndEntities(),
      this.postRepository
        .createQueryBuilder('post')
        .leftJoin('post.board', 'board')
        .where('board.slug = :slug', { slug })
        .getCount(),
    ]);

    // 댓글 수를 포함한 게시글 데이터 구성
    const postsWithComments = items.entities.map((post, index) => {
      const commentCount = parseInt(items.raw[index].commentCount) || 0;
      return {
        ...post,
        comments: new Array(commentCount).fill({ id: 0 }), // UI 호환성을 위한 배열
      };
    });

    return new PaginatedResponse({
      items: postsWithComments,
      total: totalCount,
      totalPages: Math.ceil(totalCount / perPage),
      page,
      perPage,
    });
  }

  async findById(id: number): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['author', 'author.userLevel', 'board'],
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    // 조회수 업데이트를 비동기로 실행 (응답 속도 개선)
    this.postRepository
      .increment({ id }, 'viewCount', 1)
      .catch((err) => console.error('Failed to increment view count:', err));
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

  async toggleNotice(id: number, isNotice: boolean): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['author', 'author.userLevel', 'board'],
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    post.isNotice = isNotice;

    // 공지글로 설정할 때 순서 자동 할당
    if (isNotice && !post.noticeOrder) {
      const maxOrder = await this.postRepository
        .createQueryBuilder('post')
        .where('post.boardId = :boardId', { boardId: post.board.id })
        .andWhere('post.isNotice = true')
        .select('MAX(post.noticeOrder)', 'maxOrder')
        .getRawOne();

      post.noticeOrder = (maxOrder?.maxOrder || 0) + 1;
    }

    await this.postRepository.save(post);

    return post;
  }

  async moveNoticeUp(id: number): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['author', 'author.userLevel', 'board'],
    });

    if (!post || !post.isNotice) {
      throw new NotFoundException('공지글을 찾을 수 없습니다.');
    }

    // 현재 순서보다 바로 위에 있는 공지글 찾기
    const upperPost = await this.postRepository
      .createQueryBuilder('post')
      .where('post.boardId = :boardId', { boardId: post.board.id })
      .andWhere('post.isNotice = true')
      .andWhere('post.noticeOrder < :currentOrder', {
        currentOrder: post.noticeOrder,
      })
      .orderBy('post.noticeOrder', 'DESC')
      .getOne();

    if (upperPost) {
      // 순서 교환
      const tempOrder = post.noticeOrder;
      post.noticeOrder = upperPost.noticeOrder;
      upperPost.noticeOrder = tempOrder;

      await this.postRepository.save([post, upperPost]);
    }

    return post;
  }

  async moveNoticeDown(id: number): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['author', 'author.userLevel', 'board'],
    });

    if (!post || !post.isNotice) {
      throw new NotFoundException('공지글을 찾을 수 없습니다.');
    }

    // 현재 순서보다 바로 아래에 있는 공지글 찾기
    const lowerPost = await this.postRepository
      .createQueryBuilder('post')
      .where('post.boardId = :boardId', { boardId: post.board.id })
      .andWhere('post.isNotice = true')
      .andWhere('post.noticeOrder > :currentOrder', {
        currentOrder: post.noticeOrder,
      })
      .orderBy('post.noticeOrder', 'ASC')
      .getOne();

    if (lowerPost) {
      // 순서 교환
      const tempOrder = post.noticeOrder;
      post.noticeOrder = lowerPost.noticeOrder;
      lowerPost.noticeOrder = tempOrder;

      await this.postRepository.save([post, lowerPost]);
    }

    return post;
  }

  async setNoticeOrder(id: number, newOrder: number): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['author', 'author.userLevel', 'board'],
    });

    if (!post || !post.isNotice) {
      throw new NotFoundException('공지글을 찾을 수 없습니다.');
    }

    const oldOrder = post.noticeOrder;

    // 동일한 게시판의 다른 공지글들 순서 조정
    if (newOrder < oldOrder) {
      // 위로 이동하는 경우: 사이에 있는 공지글들을 한 칸씩 아래로
      await this.postRepository
        .createQueryBuilder()
        .update(Post)
        .set({ noticeOrder: () => 'noticeOrder + 1' })
        .where('boardId = :boardId', { boardId: post.board.id })
        .andWhere('isNotice = true')
        .andWhere('noticeOrder >= :newOrder', { newOrder })
        .andWhere('noticeOrder < :oldOrder', { oldOrder })
        .execute();
    } else if (newOrder > oldOrder) {
      // 아래로 이동하는 경우: 사이에 있는 공지글들을 한 칸씩 위로
      await this.postRepository
        .createQueryBuilder()
        .update(Post)
        .set({ noticeOrder: () => 'noticeOrder - 1' })
        .where('boardId = :boardId', { boardId: post.board.id })
        .andWhere('isNotice = true')
        .andWhere('noticeOrder > :oldOrder', { oldOrder })
        .andWhere('noticeOrder <= :newOrder', { newOrder })
        .execute();
    }

    // 현재 게시글 순서 설정
    post.noticeOrder = newOrder;
    await this.postRepository.save(post);

    return post;
  }
}
