import { Controller, Get, Query } from '@nestjs/common';
import { CrawlerService } from 'src/modules/crawler/crawler.service';
import { GetSaveMatchDataDto } from 'src/modules/crawler/dto/request/get-save-match-data.dto';

@Controller('crawler')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Get('broadcasts')
  async getBroadcasts(
    @Query('crewId') crewId?: string,
    @Query('streamerIds') streamerIds?: string,
  ) {
    // 스트리머 ID가 제공된 경우 처리
    if (streamerIds) {
      const streamerIdArray = streamerIds
        .split(',')
        .filter((id) => id.trim() !== '');
      if (streamerIdArray.length > 0) {
        return this.crawlerService.getStreamingData({
          crewId: crewId ? parseInt(crewId) : undefined,
          streamerIds: streamerIdArray,
        });
      }
    }

    // 기존 크루 ID 기반 처리
    return this.crawlerService.getStreamingData({
      crewId: crewId ? parseInt(crewId) : undefined,
    });
  }

  @Get('live-crews')
  async getLiveCrewsInfo() {
    return this.crawlerService.getLiveCrewsInfo();
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

  /**
   * 월간 ELO 포인트 크롤링 테스트용 엔드포인트
   * 이 엔드포인트는 실제 운영 환경에서는 삭제하거나 권한 설정을 통해 보호해야 합니다.
   */
  @Get('test-elo-crawler')
  async testEloCrawler() {
    await this.crawlerService.crawlMonthlyEloPoints();
    return { message: '월간 ELO 포인트 크롤링 테스트가 실행되었습니다.' };
  }
}
