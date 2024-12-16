import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';
import { StreamInfo } from 'src/modules/crawler/type';

@Injectable()
export class CrawlerService {
  private readonly CHUNK_SIZE = 50;
  private readonly MIN_VIEW_COUNT = 10;
  private readonly LOAD_TIMEOUT = 30000; // 30초

  async getAfreecaInfo() {
    console.time('getAfreecaInfo');
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.goto('https://www.sooplive.co.kr/live/all', {
        timeout: this.LOAD_TIMEOUT,
        waitUntil: 'networkidle',
      });

      await this.loadAllContent(page);
      const streamInfos = await this.extractAllStreamInfo(page);

      console.timeEnd('getAfreecaInfo');
      return streamInfos;
    } catch (error) {
      console.error('크롤링 실패:', error);
      throw new Error(`크롤링 실패: ${error.message}`);
    } finally {
      await browser.close();
    }
  }

  private async loadAllContent(page: any) {
    while (true) {
      try {
        const cards = await page.locator('li[data-type="cBox"]').all();
        if (cards.length === 0) break;

        const lastCard = cards[cards.length - 1];
        const viewCountText = await lastCard
          .locator('[data-testid="view-count"]')
          .textContent();

        const viewCount = this.parseViewCount(viewCountText);
        if (viewCount < this.MIN_VIEW_COUNT) break;

        const showMoreButton = await page.locator('.show_more button').first();
        if (!(await showMoreButton.isVisible())) break;

        await showMoreButton.click();
        await page.waitForLoadState('networkidle');
      } catch (error) {
        console.error('컨텐츠 로딩 중 에러:', error);
        break;
      }
    }
  }

  private async extractAllStreamInfo(page: any): Promise<StreamInfo[]> {
    const streamerCards = await page.locator('li[data-type="cBox"]').all();
    const cardChunks = this.chunkArray(streamerCards, this.CHUNK_SIZE);
    let allStreamInfos: StreamInfo[] = [];

    for (const chunk of cardChunks) {
      const chunkInfos = await Promise.all(
        chunk.map((card) => this.extractStreamInfo(card)),
      );

      const validChunkInfos = chunkInfos.filter(
        (info): info is NonNullable<typeof info> =>
          info !== null &&
          info.nickname !== '' &&
          info.title !== '' &&
          info.viewCount >= 0,
      );

      allStreamInfos = [...allStreamInfos, ...validChunkInfos];
    }

    return allStreamInfos;
  }

  private async extractStreamInfo(card: any): Promise<StreamInfo | null> {
    try {
      const [
        thumbnailSrc,
        viewCountText,
        profileUrl,
        profileImgSrc,
        nickname,
        title,
      ] = await Promise.all([
        card.locator('.thumbs-box img').first().getAttribute('src'),
        card.locator('[data-testid="view-count"]').textContent(),
        card.locator('a.thumb').getAttribute('href'),
        card.locator('a.thumb img').getAttribute('src'),
        card.locator('.details .nick span').textContent(),
        card.locator('h3.title a').getAttribute('title'),
      ]);

      return {
        thumbnail: thumbnailSrc || '',
        viewCount: this.parseViewCount(viewCountText),
        profileUrl: profileUrl || '',
        profileImage: profileImgSrc || '',
        nickname: nickname?.trim() || '',
        title: title || '',
        crawledAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('스트림 정보 추출 실패:', error);
      return null;
    }
  }

  private parseViewCount(viewCount: string | null): number {
    if (!viewCount) return 0;
    return parseInt(viewCount.replace(/,/g, ''), 10) || 0;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
