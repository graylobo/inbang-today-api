import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { PostService } from './post.service';

@Controller('comments')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly postService: PostService,
  ) {}

  @Get('post/:postId')
  async findByPostId(@Param('postId') postId: string) {
    return this.commentService.findByPostId(+postId);
  }

  @Post()
  async create(@Body() commentData: any, @Request() req: any) {
    const post = await this.postService.findById(commentData.postId);
    
    // 익명 게시판의 글이 아닌 경우 로그인 필요
    if (!post.board.isAnonymous) {
      if (!req.user) {
        throw new UnauthorizedException('로그인이 필요합니다.');
      }
      commentData.author = { id: req.user.id };
    }

    return this.commentService.create(commentData);
  }

  @Post(':parentId/reply')
  async createReply(
    @Param('parentId') parentId: string,
    @Body() replyData: any,
    @Request() req: any,
  ) {
    const parentComment = await this.commentService.findById(+parentId);
    const post = await this.postService.findById(parentComment.post.id);
    
    // 익명 게시판의 글이 아닌 경우 로그인 필요
    if (!post.board.isAnonymous) {
      if (!req.user) {
        throw new UnauthorizedException('로그인이 필요합니다.');
      }
      replyData.author = { id: req.user.id };
    }

    return this.commentService.createReply(+parentId, replyData);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req: any,
  ) {
    const comment = await this.commentService.findById(+id);
    
    // 익명 댓글이 아닌 경우 작성자 확인
    if (comment.author && (!req.user || comment.author.id !== req.user.id)) {
      throw new UnauthorizedException('수정 권한이 없습니다.');
    }

    return this.commentService.update(+id, updateData, updateData.password);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Query('password') password: string,
    @Request() req: any,
  ) {
    const comment = await this.commentService.findById(+id);
    
    // 익명 댓글이 아닌 경우 작성자 확인
    if (comment.author && (!req.user || comment.author.id !== req.user.id)) {
      throw new UnauthorizedException('삭제 권한이 없습니다.');
    }

    return this.commentService.delete(+id, password);
  }
} 