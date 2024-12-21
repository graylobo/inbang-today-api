import { Module } from '@nestjs/common';
import { LiveStreamGateway } from 'src/gateway/live-streamer.gateway';
import { CrawlerController } from 'src/modules/crawler/crawler.controller';
import { CrawlerService } from 'src/modules/crawler/crawler.service';
import { RedisModule } from 'src/modules/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [CrawlerService, LiveStreamGateway],
  controllers: [CrawlerController],
  exports: [CrawlerService],
})
export class CrawlerModule {}
