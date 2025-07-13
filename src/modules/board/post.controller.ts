import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { BoardAuthGuard } from 'src/guards/board-auth.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { BoardService } from './board.service';
import { PostService } from './post.service';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { User } from 'src/entities/user.entity';

@Controller('posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly boardService: BoardService,
  ) {}

  @Get('board/:boardId')
  async findAll(
    @Param('boardId') boardId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.postService.findAll(+boardId, query);
  }

  @Get('board/slug/:slug')
  async findAllBySlug(
    @Param('slug') slug: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.postService.findAllBySlug(slug, query);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.postService.findById(+id);
  }

  @Post()
  @UseGuards(BoardAuthGuard)
  async create(
    @Body() postData: any,
    @Request() req: any,
    @CurrentUser() user: User,
  ) {
    const board = await this.boardService.findById(postData.boardId);

    // 익명 게시판이 아닌 경우 작성자 정보 설정
    if (!board.isAnonymous) {
      postData.authorName = req.user.name;
      postData.author = { id: user.id };
    }
    postData.ipAddress = req.ip || req.connection.remoteAddress;

    return this.postService.create(postData);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req: any,
  ) {
    const post = await this.postService.findById(+id);

    // 익명 게시글이 아닌 경우 작성자 확인
    if (post.author && (!req.user || post.author.id !== req.user.userId)) {
      throw new UnauthorizedException('수정 권한이 없습니다.');
    }

    return this.postService.update(+id, updateData, updateData.password);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('id') id: string,
    @Query('password') password: string,
    @Request() req: any,
  ) {
    const post = await this.postService.findById(+id);

    // 익명 게시글이 아닌 경우 작성자 확인
    if (post.author && (!req.user || post.author.id !== req.user.userId)) {
      throw new UnauthorizedException('삭제 권한이 없습니다.');
    }

    return this.postService.delete(+id, password);
  }

  @Patch(':id/notice')
  @UseGuards(AdminGuard)
  async toggleNotice(
    @Param('id') id: string,
    @Body() data: { isNotice: boolean },
  ) {
    return this.postService.toggleNotice(+id, data.isNotice);
  }

  @Patch(':id/notice-order/up')
  @UseGuards(AdminGuard)
  async moveNoticeUp(@Param('id') id: string) {
    return this.postService.moveNoticeUp(+id);
  }

  @Patch(':id/notice-order/down')
  @UseGuards(AdminGuard)
  async moveNoticeDown(@Param('id') id: string) {
    return this.postService.moveNoticeDown(+id);
  }

  @Patch(':id/notice-order')
  @UseGuards(AdminGuard)
  async setNoticeOrder(
    @Param('id') id: string,
    @Body() data: { order: number },
  ) {
    return this.postService.setNoticeOrder(+id, data.order);
  }
}
