import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { LikesService } from './likes.service';

// Request에 user 프로퍼티를 추가하기 위한 인터페이스 확장
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    [key: string]: any;
  };
}

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post('posts/:id/like')
  @UseGuards(OptionalAuthGuard)
  async togglePostLike(
    @Param('id') postId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || null;
    const ipAddress = req.ip;
    return this.likesService.togglePostLike(postId, userId, ipAddress);
  }

  @Post('comments/:id/like')
  @UseGuards(OptionalAuthGuard)
  async toggleCommentLike(
    @Param('id') commentId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || null;
    const ipAddress = req.ip;
    return this.likesService.toggleCommentLike(commentId, userId, ipAddress);
  }

  @Get('posts/:id/count')
  async getPostLikeCount(@Param('id') postId: number) {
    return this.likesService.getPostLikeCount(postId);
  }

  @Get('comments/:id/count')
  async getCommentLikeCount(@Param('id') commentId: number) {
    return this.likesService.getCommentLikeCount(commentId);
  }

  @Get('posts/:id/status')
  @UseGuards(OptionalAuthGuard)
  async hasUserLikedPost(
    @Param('id') postId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || null;
    const ipAddress = req.ip;
    return this.likesService.hasUserLikedPost(postId, userId, ipAddress);
  }

  @Get('comments/:id/status')
  @UseGuards(OptionalAuthGuard)
  async hasUserLikedComment(
    @Param('id') commentId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id || null;
    const ipAddress = req.ip;
    return this.likesService.hasUserLikedComment(commentId, userId, ipAddress);
  }
}
