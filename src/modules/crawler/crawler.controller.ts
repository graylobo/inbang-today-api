import { Controller, Get } from '@nestjs/common';
import { CrawlerService } from 'src/modules/crawler/crawler.service';

@Controller('crawler')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Get('broadcasts')
  async getBroadcasts() {
    return this.crawlerService.getAfreecaInfo();
  }
}
