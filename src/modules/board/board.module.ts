import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
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
import { BoardAuthGuard } from '../../guards/board-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Board, Post, Comment]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: configService.get<string>('jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    BoardService,
    PostService,
    CommentService,
    BoardSeedService,
    BoardAuthGuard,
  ],
  controllers: [BoardController, PostController, CommentController],
  exports: [BoardService, PostService, CommentService],
})
export class BoardModule {}
