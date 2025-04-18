import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { PostService } from './post.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { BoardAuthGuard } from 'src/guards/board-auth.guard';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

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

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.postService.findById(+id);
  }

  @Post()
  @UseGuards(BoardAuthGuard)
  async create(@Body() postData: any, @Request() req: any) {
    const board = await this.boardService.findById(postData.boardId);

    // 익명 게시판이 아닌 경우 작성자 정보 설정
    if (!board.isAnonymous) {
      postData.author = { id: req.user.userId };
    } else {
      // 익명 게시판인 경우 IP 주소 저장
      postData.ipAddress = req.ip || req.connection.remoteAddress;
    }

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
}
