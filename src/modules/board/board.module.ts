import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../../entities/board.entity';
import { Post } from '../../entities/post.entity';
import { Comment } from '../../entities/comment.entity';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { BoardSeedService } from './board.seed';

@Module({
  imports: [TypeOrmModule.forFeature([Board, Post, Comment])],
  providers: [BoardService, PostService, CommentService, BoardSeedService],
  controllers: [BoardController, PostController, CommentController],
  exports: [BoardService, PostService, CommentService],
})
export class BoardModule {}
