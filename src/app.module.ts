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
import { Streamer } from './entities/streamer.entity';
import { CrewRank } from './entities/crew-rank.entity';
import { Crew } from './entities/crew.entity';
import { User } from './entities/user.entity';
import { UserCrewPermission } from './entities/user-crew-permission.entity';
import { AuthModule } from './modules/auth/auth.module';
import { BoardModule } from './modules/board/board.module';
import { CrewBroadcastModule } from './modules/crew-broadcast/crew-broadcast.module';
import { CrewEarningModule } from './modules/crew-earning/crew-earning.module';
import { StreamerModule } from './modules/streamer/streamer.module';
import { CrewRankModule } from './modules/crew-rank/crew-rank.module';
import { CrewSignatureModule } from './modules/crew-signature/crew-signature.module';
import { CrewModule } from './modules/crew/crew.module';
import { UserPermissionModule } from './modules/user-permission/user-permission.module';
import { ScheduleModule } from '@nestjs/schedule';
import { LiveStreamModule } from 'src/modules/live-stream/live-stream.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StarCraftGameMatch } from 'src/entities/starcraft-game-match.entity';
import { StarCraftMap } from 'src/entities/starcraft-map.entity';
import { StarCraftGameMatchModule } from 'src/modules/starcraft-game-match/starcraft-game-match.module';
import { EditorModule } from 'src/modules/editor/editor.module';
import { AwsModule } from 'src/modules/aws/aws.module';
import { validate } from 'src/config/env.validation';
import configuration from 'src/config/configuration';
import { StarCraftGameMatchHistory } from 'src/entities/starcraft-game-match-history.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
      validate,
      envFilePath: (() => {
        switch (process.env.NODE_ENV) {
          case 'development':
            return '.env.development';
          case 'production':
            return '.env.production';
          default:
            return '.env';
        }
      })(),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ...(process.env.NODE_ENV === 'production' &&
        process.env.DISABLE_SSL !== 'true' && {
          ssl: {
            ca: 'global-bundle.pem',
          },
          extra: {
            ssl: { rejectUnauthorized: false },
          },
        }),
      entities: [
        Crew,
        Streamer,
        CrewRank,
        CrewEarning,
        User,
        UserCrewPermission,
        CrewBroadcast,
        CrewSignature,
        Board,
        Post,
        Comment,
        CrewSignatureDance,
        StarCraftGameMatch,
        StarCraftGameMatchHistory,
        StarCraftMap,
      ],
      synchronize: true,
      // logging: true, // SQL 쿼리 로깅 활성화
    }),
    AuthModule,
    CrewModule,
    StreamerModule,
    CrewRankModule,
    CrewEarningModule,
    CrewBroadcastModule,
    CrawlerModule,
    CrewSignatureModule,
    UserPermissionModule,
    BoardModule,
    LiveStreamModule,
    StarCraftGameMatchModule,
    EditorModule,
    AwsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
