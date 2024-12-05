import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { PostService } from './post.service';
import { BoardService } from './board.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly boardService: BoardService,
  ) {}

  @Get('board/:boardId')
  async findAll(@Param('boardId') boardId: string) {
    return this.postService.findAll(+boardId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.postService.findById(+id);
  }

  @Post()
  async create(@Body() postData: any, @Request() req: any) {
    const board = await this.boardService.findById(postData.boardId);
    
    // 익명 게시판이 아닌 경우 로그인 필요
    if (!board.isAnonymous) {
      if (!req.user) {
        throw new UnauthorizedException('로그인이 필요합니다.');
      }
      postData.author = { id: req.user.id };
    }

    return this.postService.create(postData);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req: any,
  ) {
    const post = await this.postService.findById(+id);
    
    // 익명 게시글이 아닌 경우 작성자 확인
    if (post.author && (!req.user || post.author.id !== req.user.id)) {
      throw new UnauthorizedException('수정 권한이 없습니다.');
    }

    return this.postService.update(+id, updateData, updateData.password);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Query('password') password: string,
    @Request() req: any,
  ) {
    const post = await this.postService.findById(+id);
    
    // 익명 게시글이 아닌 경우 작성자 확인
    if (post.author && (!req.user || post.author.id !== req.user.id)) {
      throw new UnauthorizedException('삭제 권한이 없습니다.');
    }

    return this.postService.delete(+id, password);
  }
} 