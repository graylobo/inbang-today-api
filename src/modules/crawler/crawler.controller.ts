import { Controller, Get, Query } from '@nestjs/common';
import { CrawlerService } from 'src/modules/crawler/crawler.service';
import { GetSaveMatchDataDto } from 'src/modules/crawler/dto/request/get-save-match-data.dto';

@Controller('crawler')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Get('broadcasts')
  async getBroadcasts() {
    return this.crawlerService.getStreamingData();
  }

  @Get('match-history')
  async getMatchHistory(@Query() query: GetSaveMatchDataDto) {
    return this.crawlerService.getMatchHistory(query.startDate, query.endDate);
  }

  @Get('save-match-data')
  async saveMatchData(@Query() query: GetSaveMatchDataDto) {
    return this.crawlerService.saveMatchData(query);
  }

  @Get('update-soop-ids')
  async updateAllStreamersSoopId() {
    await this.crawlerService.updateAllStreamersSoopId();
    return { message: '스트리머 정보 업데이트가 완료되었습니다.' };
  }
}
