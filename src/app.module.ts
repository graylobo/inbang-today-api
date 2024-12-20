import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { Board } from 'src/entities/board.entity';
import { Comment } from 'src/entities/comment.entity';
import { CrewSignatureDance } from 'src/entities/crew-signature-dance.entity';
import { CrewSignature } from 'src/entities/crew-signature.entity';
import { Post } from 'src/entities/post.entity';
import { CrawlerModule } from 'src/modules/crawler/crawler.module';
import { CrewBroadcast } from './entities/crew-broadcast.entity';
import { CrewEarning } from './entities/crew-earning.entity';
import { CrewMember } from './entities/crew-member.entity';
import { CrewRank } from './entities/crew-rank.entity';
import { Crew } from './entities/crew.entity';
import { User } from './entities/user.entity';
import { AuthModule } from './modules/auth/auth.module';
import { BoardModule } from './modules/board/board.module';
import { CrewBroadcastModule } from './modules/crew-broadcast/crew-broadcast.module';
import { CrewEarningModule } from './modules/crew-earning/crew-earning.module';
import { CrewMemberModule } from './modules/crew-member/crew-member.module';
import { CrewRankModule } from './modules/crew-rank/crew-rank.module';
import { CrewSignatureModule } from './modules/crew-signature/crew-signature.module';
import { CrewModule } from './modules/crew/crew.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'inbang',
      entities: [
        Crew,
        CrewMember,
        CrewRank,
        CrewEarning,
        User,
        CrewBroadcast,
        CrewSignature,
        Board,
        Post,
        Comment,
        CrewSignatureDance,
      ],
      synchronize: true,
      // logging: true, // SQL 쿼리 로깅 활성화
    }),
    AuthModule,
    CrewModule,
    CrewMemberModule,
    CrewRankModule,
    CrewEarningModule,
    CrewBroadcastModule,
    CrawlerModule,
    CrewSignatureModule,
    BoardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
