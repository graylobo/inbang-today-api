import { Module } from '@nestjs/common';
import { CrawlerService } from 'src/modules/crawler/crawler.service';
import { CrawlerController } from 'src/modules/crawler/crawler.controller';
import { RedisModule } from 'src/modules/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [CrawlerService],
  controllers: [CrawlerController],
})
export class CrawlerModule {}
