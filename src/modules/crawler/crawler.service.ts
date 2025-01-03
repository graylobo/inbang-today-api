import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Browser, chromium } from 'playwright';
import { firstValueFrom } from 'rxjs';
import { STREAM_EVENTS } from 'src/events/stream.events';
import { TARGET_STREAMERS } from 'src/modules/crawler/metadata';
import { StreamInfo } from 'src/modules/crawler/type';
import { RedisService } from 'src/modules/redis/redis.service';
import * as cheerio from 'cheerio';
import { In, Repository } from 'typeorm';
import { Streamer } from 'src/entities/streamer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { StarCraftGameMatch } from 'src/entities/starcraft-game-match.entity';
import { StarCraftMap } from 'src/entities/starcraft-map.entity';
import { findOrCreate } from 'src/utils';
import { GetSaveMatchDataDto } from 'src/modules/crawler/dto/request/get-save-match-data.dto';
import { StarCraftRace } from 'src/entities/types/streamer.type';

export interface MatchData {
  date: string;
  winner: string;
  loser: string;
  map: string;
  elo: number;
  format: string;
  memo: string;
}

@Injectable()
export class CrawlerService {
  constructor(
    @InjectRepository(Streamer)
    private readonly streamerRepository: Repository<Streamer>,
    @InjectRepository(StarCraftMap)
    private readonly starCraftMapRepository: Repository<StarCraftMap>,
    @InjectRepository(StarCraftGameMatch)
    private readonly starCraftGameMatchRepository: Repository<StarCraftGameMatch>,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly httpService: HttpService,
  ) {}

  private browser: Browser | null = null;
  private readonly CHUNK_SIZE = 100;
  private readonly MIN_VIEW_COUNT = 100;
  private readonly LOAD_TIMEOUT = 60000;
  private readonly CACHE_ALL_STREAM_KEY = 'streaming_data';
  private readonly CACHE_FILTERED_STREAM_KEY = 'filtered_streams';

  private readonly CACHE_TTL = 70;

  private async initBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  private async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async getStreamingData({ useCache = true }: { useCache?: boolean } = {}) {
    if (useCache) {
      const cachedData = (await this.redisService.get(
        this.CACHE_ALL_STREAM_KEY,
      )) as string;
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    }

    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      await page.goto('https://www.sooplive.co.kr/live/all', {
        timeout: this.LOAD_TIMEOUT,
        waitUntil: 'networkidle',
      });

      await this.loadAllContent(page);
      const streamInfos = await this.extractAllStreamInfo(page);

      await page.close();

      const res = {
        streamInfos,
        totalCount: streamInfos.length,
      };

      await this.redisService.set(
        this.CACHE_ALL_STREAM_KEY,
        JSON.stringify(res),
        this.CACHE_TTL,
      );

      return res;
    } catch (error) {
      console.error('크롤링 실패:', error);
      throw new Error(`크롤링 실패: ${error.message}`);
    }
  }

  async getMatchHistory(startDate: string, endDate: string) {
    try {
      const formData = new URLSearchParams({
        wr_1: startDate,
        wr_2: endDate,
      });

      const response = await firstValueFrom(
        this.httpService.post(
          'https://eloboard.com/men/bbs/search_bj_list.php',
          formData.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          },
        ),
      );

      // return response.data;
      return this.parseMatchData(response.data);
    } catch (error) {
      console.error('전적 조회 실패:', error);
      throw new Error(`전적 조회 실패: ${error.message}`);
    }
  }

  async saveMatchData(query: GetSaveMatchDataDto, batchSize: number = 1000) {
    try {
      const matchData = await this.getMatchHistory(
        query.startDate,
        query.endDate,
      );

      // 1. 스트리머 정보 파싱 및 중복 제거
      const parsedStreamers = new Map();
      matchData.forEach((match) => {
        ['winner', 'loser'].forEach((role) => {
          const fullName = match[role];
          const parsed = this.parseStreamerNameAndRace(fullName);
          parsedStreamers.set(parsed.name, parsed);
        });
      });

      // 2. 맵 이름 중복 제거
      const uniqueMaps = new Set(matchData.map((m) => m.map));

      // 3. 기존 데이터 일괄 조회
      const [existingStreamers, existingMaps] = await Promise.all([
        this.streamerRepository.find({
          where: { name: In([...parsedStreamers.keys()]) },
        }),
        this.starCraftMapRepository.find({
          where: { name: In([...uniqueMaps]) },
        }),
      ]);

      // 4. 캐시 맵 생성
      const existingStreamerMapCache = new Map(
        existingStreamers.map((s) => [s.name, s]),
      );
      const existingMapCache = new Map(existingMaps.map((m) => [m.name, m]));

      // 5. 새로운 스트리머 생성
      const streamersToCreate = [...parsedStreamers.values()].filter(
        ({ name }) => !existingStreamerMapCache.has(name),
      );

      if (streamersToCreate.length > 0) {
        const newStreamers =
          await this.streamerRepository.save(streamersToCreate);
        newStreamers.forEach((s) => existingStreamerMapCache.set(s.name, s));
      }

      // 6. 새로운 맵 생성
      const mapsToCreate = [...uniqueMaps]
        .filter((name) => !existingMapCache.has(name))
        .map((name) => ({ name }));

      if (mapsToCreate.length > 0) {
        const newMaps = await this.starCraftMapRepository.save(mapsToCreate);
        newMaps.forEach((m) => existingMapCache.set(m.name, m));
      }

      // 7. 매치 해시 생성
      const matchHashes = matchData.map((element) => {
        const { date, winner, loser, map, elo, format, memo } = element;
        const { name: winnerName } = this.parseStreamerNameAndRace(winner);
        const { name: loserName } = this.parseStreamerNameAndRace(loser);

        return {
          hash: StarCraftGameMatch.generateHash({
            date: new Date(date),
            winner: winnerName,
            loser: loserName,
            map,
            format,
            memo,
            eloPoint: elo,
          }),
          data: { date, winnerName, loserName, map, elo, format, memo },
        };
      });

      // 8. 중복 제거를 위한 Set 생성
      const uniqueHashes = new Set();
      const uniqueMatches = [];

      // 9. 중복 없는 매치 데이터만 생성
      for (const { hash, data } of matchHashes) {
        if (!uniqueHashes.has(hash)) {
          uniqueHashes.add(hash);
          const match = new StarCraftGameMatch();
          match.date = new Date(data.date);
          match.winner = existingStreamerMapCache.get(data.winnerName);
          match.loser = existingStreamerMapCache.get(data.loserName);
          match.map = existingMapCache.get(data.map);
          match.eloPoint = data.elo;
          match.format = data.format;
          match.memo = data.memo;
          match.uniqueHash = hash;
          uniqueMatches.push(match);
        }
      }

      // 10. 배치 단위로 저장 (트랜잭션 사용)
      for (let i = 0; i < uniqueMatches.length; i += batchSize) {
        const batch = uniqueMatches.slice(i, i + batchSize);
        await this.starCraftGameMatchRepository.manager.transaction(
          async (manager) => {
            // 이미 존재하는 해시 확인
            const existingHashes = await manager.find(StarCraftGameMatch, {
              where: { uniqueHash: In(batch.map((m) => m.uniqueHash)) },
              select: ['uniqueHash'],
            });

            // 중복되지 않은 매치만 저장
            const hashSet = new Set(existingHashes.map((m) => m.uniqueHash));
            const newBatch = batch.filter(
              (match) => !hashSet.has(match.uniqueHash),
            );

            if (newBatch.length > 0) {
              await manager.save(StarCraftGameMatch, newBatch);
            }
          },
        );
      }

      return true;
    } catch (error) {
      throw new Error(`매치 데이터 저장 중 오류 발생: ${error.message}`);
    }
  }
  private parseMatchData(html: string) {
    const $ = cheerio.load(html);
    const matches: MatchData[] = [];

    $('table.table tbody tr').each((_, row) => {
      const match: MatchData = {
        date: $(row).find('td:nth-child(1)').text().trim(),
        winner: $(row).find('td:nth-child(2)').text().trim(),
        loser: $(row).find('td:nth-child(3)').text().trim(),
        map: $(row).find('td:nth-child(4)').text().trim(),
        elo: parseFloat($(row).find('td:nth-child(5)').text().trim()),
        format: $(row).find('td:nth-child(6)').text().trim(),
        memo: $(row).find('td:nth-child(7)').text().trim(),
      };

      matches.push(match);
    });

    return matches;
  }
  // @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    console.log('크롤링 시작:', new Date().toISOString());
    try {
      const streams = await this.getStreamingData({ useCache: false });
      console.log('스트림 데이터 조회 완료:', streams.totalCount);

      const filteredStreams = await this.getFilteredStreamingData(
        streams.streamInfos,
      );
      console.log('필터링된 스트림 수:', filteredStreams.length);

      await Promise.all([
        this.redisService.set(
          this.CACHE_ALL_STREAM_KEY,
          JSON.stringify(streams),
          this.CACHE_TTL,
        ),
        this.redisService.set(
          this.CACHE_FILTERED_STREAM_KEY,
          JSON.stringify(filteredStreams),
          this.CACHE_TTL,
        ),
      ]);
      this.eventEmitter.emit(STREAM_EVENTS.UPDATE, streams);
      console.log('캐시 업데이트 완료');
    } catch (error) {
      console.error('크롤링 실패:', error);
    } finally {
      await this.closeBrowser();
    }
  }

  async onApplicationShutdown() {
    await this.closeBrowser();
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
        (info) => info !== null && info.nickname !== '' && info.title !== '',
      );

      allStreamInfos = [...allStreamInfos, ...validChunkInfos];
    }

    return allStreamInfos;
  }

  private async extractStreamInfo(card: any): Promise<StreamInfo | null> {
    try {
      // evaluate를 사용하여 한 번에 모든 데이터 추출
      const data = await card.evaluate((el: any) => {
        // DOM에서 직접 데이터 추출
        const thumbnail =
          el.querySelector('.thumbs-box img')?.getAttribute('src') || '';
        const viewCount =
          el.querySelector('[data-testid="view-count"]')?.textContent || '0';
        const profileUrl =
          el.querySelector('a.thumb')?.getAttribute('href') || '';
        const nickname =
          el.querySelector('.details .nick span')?.textContent?.trim() || '';
        const title =
          el.querySelector('h3.title a')?.getAttribute('title') || '';

        return {
          thumbnail,
          viewCount,
          profileUrl,
          nickname,
          title,
        };
      });

      return {
        ...data,
        thumbnail: this.normalizeThumbnailUrl(data.thumbnail),
        viewCount: this.parseViewCount(data.viewCount),
        profileImage: this.generateProfileImage(data.profileUrl),
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

  private generateProfileImage(profileUrl: string): string {
    try {
      // profileUrl에서 채널 ID 추출 (마지막 '/' 이후의 문자열)
      const channelId = profileUrl.split('/').pop() || '';

      // 첫 두 글자 추출
      const prefix = channelId.slice(0, 2).toLowerCase();

      // profileImage URL 생성
      return `https://stimg.sooplive.co.kr/LOGO/${prefix}/${channelId}/m/${channelId}.webp`;
    } catch (error) {
      console.error('프로필 이미지 URL 생성 실패:', error);
      return '';
    }
  }

  private normalizeThumbnailUrl(url: string): string {
    if (!url) return '';

    // URL이 //로 시작하면 https: 추가
    if (url.startsWith('//')) {
      return `https:${url}`;
    }

    return url;
  }

  private async getFilteredStreamingData(streams): Promise<StreamInfo[]> {
    return streams.filter((stream) =>
      TARGET_STREAMERS.includes(stream.profileUrl.split('/').pop() || ''),
    );
  }

  private parseStreamerNameAndRace(fullName: string): {
    name: string;
    race: StarCraftRace;
  } {
    const raceMap = {
      T: StarCraftRace.Terran,
      P: StarCraftRace.Protoss,
      Z: StarCraftRace.Zerg,
    };

    const match = fullName.match(/^(.+?)([TPZ])$/);

    if (match) {
      return {
        name: match[1].trim(),
        race: raceMap[match[2] as keyof typeof raceMap],
      };
    }

    return {
      name: fullName.trim(),
      race: null,
    };
  }
}
