import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LikesService } from './likes.service';

// Request에 user 프로퍼티를 추가하기 위한 인터페이스 확장
interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    [key: string]: any;
  };
}

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  async likePost(
    @Param('id') postId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;

    // 좋아요 토글만 호출하고 모든 정보를 한 번에 반환받음
    return this.likesService.togglePostLike(postId, 'like', userId);
  }

  @Post('posts/:id/dislike')
  @UseGuards(JwtAuthGuard)
  async dislikePost(
    @Param('id') postId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;

    // 싫어요 토글만 호출하고 모든 정보를 한 번에 반환받음
    return this.likesService.togglePostLike(postId, 'dislike', userId);
  }

  @Post('comments/:id/like')
  @UseGuards(JwtAuthGuard)
  async toggleCommentLike(
    @Param('id') commentId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    return this.likesService.toggleCommentLike(commentId, userId);
  }

  @Get('posts/:id/count')
  async getPostLikeCount(@Param('id') postId: number) {
    return this.likesService.getPostLikeCounts(postId);
  }

  @Get('comments/:id/count')
  async getCommentLikeCount(@Param('id') commentId: number) {
    return this.likesService.getCommentLikeCounts(commentId);
  }

  @Get('posts/:id/status')
  @UseGuards(JwtAuthGuard)
  async getPostLikeStatus(
    @Param('id') postId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    return this.likesService.getPostLikeStatus(postId, userId);
  }

  @Get('comments/:id/status')
  @UseGuards(JwtAuthGuard)
  async getCommentLikeStatus(
    @Param('id') commentId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    return this.likesService.getCommentLikeStatus(commentId, userId);
  }
}
