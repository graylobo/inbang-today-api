import { Module } from '@nestjs/common';
import { CrawlerService } from 'src/modules/crawler/crawler.service';
import { CrawlerController } from 'src/modules/crawler/crawler.controller';

@Module({
  providers: [CrawlerService],
  controllers: [CrawlerController],
})
export class CrawlerModule {}
