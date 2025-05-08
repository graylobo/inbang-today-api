import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StarCraftGameMatch } from 'src/entities/starcraft-game-match.entity';
import { StarCraftMap } from 'src/entities/starcraft-map.entity';
import { Streamer } from 'src/entities/streamer.entity';
import { Category } from 'src/entities/category.entity';
import { StreamerCategory } from 'src/entities/streamer-category.entity';
import { LiveStreamGateway } from 'src/gateway/live-streamer.gateway';
import { CrawlerController } from 'src/modules/crawler/crawler.controller';
import { CrawlerService } from 'src/modules/crawler/crawler.service';
import { RedisModule } from 'src/modules/redis/redis.module';
import { StreamerCategoryService } from 'src/modules/category/streamer-category.service';
import { Crew } from 'src/entities/crew.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Streamer,
      StarCraftMap,
      StarCraftGameMatch,
      Category,
      StreamerCategory,
      Crew,
    ]),
    RedisModule,
    HttpModule,
  ],
  providers: [CrawlerService, LiveStreamGateway, StreamerCategoryService],
  controllers: [CrawlerController],
  exports: [CrawlerService],
})
export class CrawlerModule {}
