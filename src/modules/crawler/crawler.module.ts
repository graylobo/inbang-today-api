import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StarCraftGameMatch } from 'src/entities/starcraft-game-match.entity';
import { StarCraftMap } from 'src/entities/starcraft-map.entity';
import { Streamer } from 'src/entities/streamer.entity';
import { LiveStreamGateway } from 'src/gateway/live-streamer.gateway';
import { CrawlerController } from 'src/modules/crawler/crawler.controller';
import { CrawlerService } from 'src/modules/crawler/crawler.service';
import { RedisModule } from 'src/modules/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Streamer, StarCraftMap, StarCraftGameMatch]),
    RedisModule,
    HttpModule,
  ],
  providers: [CrawlerService, LiveStreamGateway],
  controllers: [CrawlerController],
  exports: [CrawlerService],
})
export class CrawlerModule {}
