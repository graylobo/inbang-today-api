import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import * as cheerio from 'cheerio';
import { Browser, chromium } from 'playwright';
import { firstValueFrom } from 'rxjs';
import { Configuration } from 'src/config/configuration';
import { Category } from 'src/entities/category.entity';
import { Crew } from 'src/entities/crew.entity';
import { StarCraftGameMatchHistory } from 'src/entities/starcraft-game-match-history.entity';
import {
  MatchOrigin,
  StarCraftGameMatch,
} from 'src/entities/starcraft-game-match.entity';
import { StarCraftMap } from 'src/entities/starcraft-map.entity';
import { Streamer } from 'src/entities/streamer.entity';
import {
  StarCraftRace,
  StreamerGender,
} from 'src/entities/types/streamer.type';
import { STREAM_EVENTS } from 'src/events/stream.events';
import { StreamerCategoryService } from 'src/modules/category/streamer-category.service';
import { GetSaveMatchDataDto } from 'src/modules/crawler/dto/request/get-save-match-data.dto';
import { TARGET_STREAMERS } from 'src/modules/crawler/metadata';
import { StreamInfo } from 'src/modules/crawler/type';
import { RedisService } from 'src/modules/redis/redis.service';
import { formatDateString } from 'src/utils/format-date-string.utils';
import { Between, ILike, In, IsNull, Repository } from 'typeorm';

export interface MatchData {
  date: string;
  winner: string;
  loser: string;
  map: string;
  elo: number;
  format: string;
  memo: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
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
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly streamerCategoryService: StreamerCategoryService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<Configuration, true>,
    @InjectRepository(Crew)
    private readonly crewRepository: Repository<Crew>,
  ) {}

  private browser: Browser | null = null;
  private readonly CHUNK_SIZE = 100;
  private readonly MIN_VIEW_COUNT = 0;
  private readonly LOAD_TIMEOUT = 60000;
  private readonly CACHE_ALL_STREAM_KEY = 'streaming_data';
  private readonly CACHE_FILTERED_STREAM_KEY = 'filtered_streams';
  private readonly CACHE_TTL = 0;

  // 크롤링 중복 실행 방지용 플래그
  private isCronJobRunning = false;
  private isCrawlingLock = false;

  private async initBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
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

  async getStreamingData({
    crewId,
    streamerIds,
  }: {
    crewId?: number;
    streamerIds?: string[];
  } = {}) {
    // If filtering by crew, use a different cache key
    const cacheKey = crewId
      ? `${this.CACHE_ALL_STREAM_KEY}_crew_${crewId}`
      : this.CACHE_ALL_STREAM_KEY;

    // 캐시된 데이터 반환 (항상 캐시만 사용)
    const cachedData = (await this.redisService.get(cacheKey)) as string;
    if (cachedData) {
      // streamerIds가 제공된 경우 추가 필터링
      if (streamerIds && streamerIds.length > 0) {
        const data = JSON.parse(cachedData);
        const filteredStreams = data.streamInfos.filter((stream) => {
          // 프로필 URL에서 스트리머 ID 추출 (마지막 부분)
          const streamerId = stream.profileUrl.split('/').pop() || '';
          return streamerIds.includes(streamerId);
        });

        return {
          streamInfos: filteredStreams,
          totalCount: filteredStreams.length,
        };
      }

      return JSON.parse(cachedData);
    }

    // 캐시가 없는 경우, 빈 결과 대신 기본 전체 캐시 확인
    if (crewId || (streamerIds && streamerIds.length > 0)) {
      const globalCachedData = (await this.redisService.get(
        this.CACHE_ALL_STREAM_KEY,
      )) as string;

      if (globalCachedData) {
        const allData = JSON.parse(globalCachedData);
        let filteredStreams = allData.streamInfos;

        // 크루 ID로 필터링
        if (crewId) {
          filteredStreams = await this.getFilteredStreamingData(
            filteredStreams,
            crewId,
          );
        }

        // 스트리머 ID로 추가 필터링
        if (streamerIds && streamerIds.length > 0) {
          filteredStreams = filteredStreams.filter((stream) => {
            const streamerId = stream.profileUrl.split('/').pop() || '';
            return streamerIds.includes(streamerId);
          });
        }

        return {
          streamInfos: filteredStreams,
          totalCount: filteredStreams.length,
        };
      }
    }

    // 캐시도 없고 cron job도 아닌 경우 빈 결과 반환
    console.log('캐시된 데이터가 없습니다');
    return { streamInfos: [], totalCount: 0 };
  }

  async getMatchHistory(startDate: string, endDate: string) {
    try {
      const formData = new URLSearchParams({
        wr_1: startDate,
        wr_2: endDate,
      });

      // const eloBoardUrl = 'https://eloboard.com/men/bbs/search_bj_list.php';
      const eloBoardUrl =
        'https://eloboard.com/women/bbs/board.php?bo_table=bj_board&page=1';

      const getResponse = await firstValueFrom(
        this.httpService.get(eloBoardUrl),
      );
      // const response = await firstValueFrom(
      //   this.httpService.post(eloBoardUrl, formData.toString(), {
      //     headers: {
      //       'Content-Type': 'application/x-www-form-urlencoded',
      //       'User-Agent':
      //         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      //     },
      //   }),
      // );

      // return response.data;
      return this.parseMatchDataFromTable(getResponse.data);
    } catch (error) {
      console.error('전적 조회 실패:', error);
      throw new Error(`전적 조회 실패: ${error.message}`);
    }
  }

  async saveMatchData(query: GetSaveMatchDataDto, batchSize: number = 1000) {
    try {
      let totalProcessed = 0;
      const { startDate, endDate } = query;

      // 1. 남자부 데이터 수집 및 처리 (POST 요청)
      console.log("Processing men's matches...");
      const menMatches = await this.getMenMatchHistory(startDate, endDate);

      if (menMatches.length > 0) {
        const processed = await this.processAndSaveMatches(
          menMatches,
          batchSize,
          MatchOrigin.MEN,
        );
        totalProcessed += processed;
        console.log(`Processed ${processed} men's matches`);
      }

      // 2. 여자부 데이터 수집 및 처리 (페이지 순회)
      console.log("Processing women's matches...");
      const processedWomen = await this.processWomenMatchHistory(
        { startDate, endDate },
        1000,
      );
      totalProcessed += processedWomen;

      console.log(`Total matches processed: ${totalProcessed}`);
      return true;
    } catch (error) {
      throw new Error(`매치 데이터 저장 중 오류 발생: ${error.message}`);
    }
  }

  private async getMenMatchHistory(
    startDate: string,
    endDate: string,
  ): Promise<MatchData[]> {
    const formData = new URLSearchParams({
      wr_1: startDate,
      wr_2: endDate,
    });

    const eloBoardUrl = 'https://eloboard.com/men/bbs/search_bj_list.php';

    const response = await firstValueFrom(
      this.httpService.post(eloBoardUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }),
    );

    return this.parseMatchData(response.data);
  }

  private async processWomenMatchHistory(
    dateRange: DateRange,
    batchSize: number,
  ): Promise<number> {
    const startDate = new Date(formatDateString(dateRange.startDate));
    const endDate = new Date(formatDateString(dateRange.endDate));
    // 날짜 유효성 검사
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error(
        'Invalid date format. Please provide dates in YYYY-MM-DD format',
      );
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before or equal to end date');
    }

    let totalProcessed = 0;
    const currentDateMatches = new Map<string, MatchData[]>();
    let currentDate: string | null = null;
    let isOutOfDateRange = false;
    let page = 1;

    while (!isOutOfDateRange) {
      try {
        console.log(`Fetching women's matches page ${page}`);

        const eloBoardUrl = `https://eloboard.com/women/bbs/board.php?bo_table=bj_board&page=${page}`;
        const response = await firstValueFrom(
          this.httpService.get(eloBoardUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          }),
        );

        const currentPageMatches = this.parseMatchDataFromTable(response.data);
        if (currentPageMatches.length === 0) {
          // 마지막으로 남은 날짜 데이터 처리
          if (currentDate && currentDateMatches.size > 0) {
            const matches = currentDateMatches.get(currentDate);
            await this.processDateMatches(matches, batchSize);
          }
          break;
        }

        // 페이지의 매치들을 처리
        for (const match of currentPageMatches) {
          const matchDate = new Date(match.date);
          const matchDateStr = matchDate.toISOString().split('T')[0];

          // 날짜 범위 체크
          if (matchDate < startDate) {
            // 날짜 범위를 벗어난 경우 (너무 과거)
            isOutOfDateRange = true;
            break;
          }

          if (matchDate > endDate) {
            // 범위를 벗어난 데이터는 스킵
            continue;
          }

          // 새로운 날짜 시작
          if (currentDate === null) {
            currentDate = matchDateStr;
          }

          // 날짜가 변경된 경우
          if (matchDateStr !== currentDate) {
            // 이전 날짜의 데이터 처리
            const matches = currentDateMatches.get(currentDate);
            if (matches) {
              const processed = await this.processDateMatches(
                matches,
                batchSize,
              );
              totalProcessed += processed;
              console.log(
                `Processed ${processed} matches for date ${currentDate}`,
              );
            }

            // 새로운 날짜 시작
            currentDate = matchDateStr;
            currentDateMatches.clear();
          }

          // 현재 날짜의 매치 추가
          if (!currentDateMatches.has(matchDateStr)) {
            currentDateMatches.set(matchDateStr, []);
          }
          currentDateMatches.get(matchDateStr).push(match);
        }

        page++;
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        // 에러 발생 시 현재까지 수집된 데이터 처리
        if (currentDate && currentDateMatches.size > 0) {
          const matches = currentDateMatches.get(currentDate);
          const processed = await this.processDateMatches(matches, batchSize);
          totalProcessed += processed;
        }
        break;
      }
    }

    // 마지막 날짜의 데이터 처리
    if (currentDate && currentDateMatches.size > 0) {
      const matches = currentDateMatches.get(currentDate);
      const processed = await this.processDateMatches(matches, batchSize);
      totalProcessed += processed;
    }

    return totalProcessed;
  }
  private async processDateMatches(
    matches: MatchData[],
    batchSize: number,
  ): Promise<number> {
    try {
      const processed = await this.processAndSaveMatches(
        matches,
        batchSize,
        MatchOrigin.WOMEN,
      );
      return processed;
    } catch (error) {
      console.error('Error processing matches:', error);
      return 0;
    }
  }

  private async processAndSaveMatches(
    matches: MatchData[],
    batchSize: number,
    origin: MatchOrigin,
  ): Promise<number> {
    // 1. 스트리머 정보 파싱 및 중복 제거
    const parsedStreamers = new Map();
    matches.forEach((match) => {
      ['winner', 'loser'].forEach((role) => {
        const fullName = match[role];
        const parsed = this.parseStreamerNameAndRace(fullName);
        parsedStreamers.set(parsed.name, parsed);
      });
    });

    // 2. 맵 이름 중복 제거
    const uniqueMaps = new Set(matches.map((m) => m.map));

    // 3. 기존 데이터 조회 및 새로운 데이터 생성
    const [existingStreamers, existingMaps] = await Promise.all([
      this.streamerRepository.find({
        where: { name: In([...parsedStreamers.keys()]) },
      }),
      this.starCraftMapRepository.find({
        where: { name: In([...uniqueMaps]) },
      }),
    ]);

    // 캐시 맵 생성
    const existingStreamerMapCache = new Map(
      existingStreamers.map((s) => [s.name, s]),
    );
    const existingMapCache = new Map(existingMaps.map((m) => [m.name, m]));

    // 새로운 스트리머와 맵 생성 (origin 파라미터 추가)
    await this.createNewStreamersAndMaps(
      parsedStreamers,
      uniqueMaps,
      existingStreamerMapCache,
      existingMapCache,
      origin, // origin 값 전달
    );

    // 매치 데이터 저장 및 처리된 매치 수 반환
    return this.saveMatchesInBatches(
      matches,
      existingStreamerMapCache,
      existingMapCache,
      batchSize,
      origin,
    );
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

  private parseMatchDataFromTable(html: string): MatchData[] {
    const $ = cheerio.load(html);
    const matches: MatchData[] = [];

    $('.table.div-table tbody tr').each((_, row) => {
      // 날짜 파싱 (a 태그 내부 텍스트)
      const date = $(row).find('td:nth-child(1) a').text().trim();

      // 승자/패자 파싱 (a 태그 내부 텍스트)
      const winner = $(row).find('td:nth-child(2) a').text().trim();
      const loser = $(row).find('td:nth-child(3) a').text().trim();

      // 나머지 필드 파싱
      const match: MatchData = {
        date,
        winner,
        loser,
        map: $(row).find('td:nth-child(4)').text().trim(),
        elo: parseFloat($(row).find('td:nth-child(5)').text().trim()),
        format: $(row).find('td:nth-child(6)').text().trim(),
        memo: $(row).find('td:nth-child(7)').text().trim(),
      };

      // 유효한 데이터만 추가
      if (date && winner && loser) {
        matches.push(match);
      }
    });

    return matches;
  }
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    // Skip if previous execution is still running
    if (this.isCronJobRunning) {
      console.log(
        'Previous cron job is still running, skipping this execution',
      );
      return;
    }

    this.isCronJobRunning = true;
    console.log('크롤링 시작:', new Date().toISOString());

    try {
      // 모든 스트림 데이터를 크롤링으로 가져옴
      const streams = await this.performCrawling(this.CACHE_ALL_STREAM_KEY);
      console.log('스트림 데이터 조회 완료:', streams.totalCount);

      // TARGET_STREAMERS 필터링 데이터
      const filteredStreams = await this.getFilteredStreamingData(
        streams.streamInfos,
      );
      console.log('필터링된 스트림 수:', filteredStreams.length);

      // 필터링된 데이터 캐시 저장
      await this.redisService.set(
        this.CACHE_FILTERED_STREAM_KEY,
        JSON.stringify({
          streamInfos: filteredStreams,
          totalCount: filteredStreams.length,
        }),
        this.CACHE_TTL,
      );

      // 모든 크루 목록 가져오기
      const crews = await this.crewRepository.find();
      console.log(`모든 크루 캐시 업데이트 시작 (${crews.length}개)`);

      // 각 크루별로 필터링된 스트림 데이터를 캐싱
      for (const crew of crews) {
        const crewFilteredStreams = await this.getFilteredStreamingData(
          streams.streamInfos,
          crew.id,
        );

        const crewStreamData = {
          streamInfos: crewFilteredStreams,
          totalCount: crewFilteredStreams.length,
        };

        const crewCacheKey = `${this.CACHE_ALL_STREAM_KEY}_crew_${crew.id}`;
        await this.redisService.set(
          crewCacheKey,
          JSON.stringify(crewStreamData),
          this.CACHE_TTL,
        );

        console.log(
          `크루 ${crew.name}(ID: ${crew.id}) 캐시 업데이트 완료: ${crewFilteredStreams.length}개 스트림`,
        );
      }

      this.eventEmitter.emit(STREAM_EVENTS.UPDATE, streams);
      console.log('모든 캐시 업데이트 완료');
    } catch (error) {
      console.error('크롤링 실패:', error);
    } finally {
      await this.closeBrowser();
      // Release the lock when the job completes
      this.isCronJobRunning = false;
      console.log('크롤링 종료:', new Date().toISOString());
    }
  }

  async onApplicationShutdown() {
    await this.closeBrowser();
  }

  private async loadAllContent(page: any) {
    while (true) {
      try {
        await page.waitForSelector('li[data-type="cBox"]', { timeout: 10000 });
        const streamers = await page.locator('li[data-type="cBox"]').all();
        console.log('streamers:::', streamers.length);
        if (streamers.length === 0) break;

        const lastStreamer = streamers[streamers.length - 1];
        let viewCount = await lastStreamer
          .locator('[data-testid="view-count"]')
          .textContent();

        viewCount = this.parseViewCount(viewCount);
        if (viewCount < this.MIN_VIEW_COUNT) break;

        const showMoreButton = await page.locator('.show_more button').first();
        if (!(await showMoreButton.isVisible())) {
          console.log('더보기 버튼이 존재하지 않음');
          break;
        }

        const currentCount = streamers.length;
        await showMoreButton.click();
        await page.waitForLoadState('networkidle');

        // 새로운 스트리머가 로드될 때까지 대기 (elements.length가  expectedCount 보다 커질때까지 5초동안 대기)
        try {
          await page.waitForFunction(
            (expectedCount) => {
              const elements = document.querySelectorAll(
                'li[data-type="cBox"]',
              );
              return elements.length > expectedCount;
            },
            currentCount,
            { timeout: 5000 },
          );
        } catch (error) {
          console.log('새로운 스트리머가 로드되지 않음', error.message);
          // 여러 번 시도해도 변화가 없으면 종료
          const newStreamers = await page.locator('li[data-type="cBox"]').all();
          if (newStreamers.length <= currentCount) {
            console.log('스트리머 수 증가 없음, 크롤링 종료');
            break;
          }
        }
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

  private async getFilteredStreamingData(
    streams,
    crewId?: number,
  ): Promise<StreamInfo[]> {
    if (!crewId) {
      // If no crewId is provided, use the original TARGET_STREAMERS list
      return streams.filter((stream) =>
        TARGET_STREAMERS.includes(stream.profileUrl.split('/').pop() || ''),
      );
    }

    // Get all streamers from the specified crew
    const crew = await this.crewRepository.findOne({
      where: { id: crewId },
      relations: ['members'],
    });

    if (!crew) {
      return [];
    }

    // Extract soopIds from crew members
    const crewSoopIds = crew.members
      .filter((member) => member.soopId)
      .map((member) => member.soopId);

    // Filter streams based on crew soopIds
    return streams.filter((stream) => {
      const streamerId = stream.profileUrl.split('/').pop() || '';
      return crewSoopIds.includes(streamerId);
    });
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

    // 먼저 이름 끝의 점들을 제거
    const cleanName = fullName
      .replace(/\.+/g, ' ') // 연속된 점들을 공백으로 변경
      .trim() // 앞뒤 공백 제거
      .replace(/\s+([TPZ])$/, '$1'); // 종족 문자 앞의 공백 제거

    const match = cleanName.match(/^(.+?)([TPZ])$/);

    if (match) {
      return {
        name: match[1].trim(),
        race: raceMap[match[2] as keyof typeof raceMap],
      };
    }

    return {
      name: cleanName.trim(),
      race: null,
    };
  }

  private async createNewStreamersAndMaps(
    parsedStreamers: Map<string, { name: string; race: StarCraftRace }>,
    uniqueMaps: Set<string>,
    existingStreamerMapCache: Map<string, Streamer>,
    existingMapCache: Map<string, StarCraftMap>,
    origin: MatchOrigin,
  ): Promise<void> {
    // 새로운 스트리머 생성
    const streamersToCreate = [...parsedStreamers.values()].filter(
      ({ name }) => !existingStreamerMapCache.has(name),
    );

    if (streamersToCreate.length > 0) {
      // MatchOrigin에 따라 gender 설정
      const streamersWithGender = streamersToCreate.map((streamer) => ({
        ...streamer,
        gender:
          origin === MatchOrigin.MEN
            ? StreamerGender.Male
            : StreamerGender.Female,
      }));

      const newStreamers =
        await this.streamerRepository.save(streamersWithGender);

      // 스트리머 캐시에 추가
      newStreamers.forEach((s) => existingStreamerMapCache.set(s.name, s));

      // 스타크래프트 카테고리 찾기
      const starcraftCategory = await this.categoryRepository.findOne({
        where: { name: ILike('%starcraft%') },
      });

      if (starcraftCategory) {
        // 각 신규 스트리머에 스타크래프트 카테고리 연결
        for (const streamer of newStreamers) {
          try {
            await this.streamerCategoryService.addCategoryToStreamer(
              streamer.id,
              starcraftCategory.id,
            );
            console.log(
              `Added starcraft category to streamer: ${streamer.name}`,
            );
          } catch (error) {
            console.error(
              `Failed to add category to streamer ${streamer.name}:`,
              error,
            );
          }
        }
      } else {
        console.warn('Starcraft category not found in the database');
      }
    }

    // 새로운 맵 생성
    const mapsToCreate = [...uniqueMaps]
      .filter((name) => !existingMapCache.has(name))
      .map((name) => ({ name }));

    if (mapsToCreate.length > 0) {
      const newMaps = await this.starCraftMapRepository.save(mapsToCreate);
      newMaps.forEach((m) => existingMapCache.set(m.name, m));
    }
  }

  private async saveMatchesInBatches(
    matches: MatchData[],
    existingStreamerMapCache: Map<string, Streamer>,
    existingMapCache: Map<string, StarCraftMap>,
    batchSize: number,
    origin: MatchOrigin,
  ): Promise<number> {
    let totalSaved = 0;

    // 1. 날짜별로 매치 그룹화
    const matchesByDate = matches.reduce(
      (acc, match) => {
        const date = new Date(match.date).toISOString().split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(match);
        return acc;
      },
      {} as Record<string, MatchData[]>,
    );

    // 2. 각 날짜별로 처리
    for (const [date, dateMatches] of Object.entries(matchesByDate)) {
      await this.starCraftGameMatchRepository.manager.transaction(
        async (manager) => {
          // 3. 해당 날짜의 모든 기존 매치 조회
          const existingMatches = await manager.find(StarCraftGameMatch, {
            where: {
              date: Between(
                new Date(`${date}T00:00:00Z`),
                new Date(`${date}T23:59:59Z`),
              ),
              origin,
            },
            relations: ['winner', 'loser', 'map'],
          });

          const historyRepository = manager.getRepository(
            StarCraftGameMatchHistory,
          );
          const newMatchesSet = new Set<string>();
          const newMatchesByHash = new Map<string, StarCraftGameMatch>();

          // 4. 새 매치 데이터 준비 (메모리 관리를 위해 배치 처리)
          for (let i = 0; i < dateMatches.length; i += batchSize) {
            const batchMatches = dateMatches.slice(i, i + batchSize);

            for (const match of batchMatches) {
              const { name: winnerName } = this.parseStreamerNameAndRace(
                match.winner,
              );
              const { name: loserName } = this.parseStreamerNameAndRace(
                match.loser,
              );

              const matchHash = StarCraftGameMatch.generateHash({
                date: new Date(match.date),
                winner: winnerName,
                loser: loserName,
                map: match.map,
                format: match.format,
                memo: match.memo,
                eloPoint: match.elo,
                origin,
              });

              if (!newMatchesSet.has(matchHash)) {
                newMatchesSet.add(matchHash);

                const newMatch = new StarCraftGameMatch();
                newMatch.date = new Date(match.date);
                newMatch.winner = existingStreamerMapCache.get(winnerName);
                newMatch.loser = existingStreamerMapCache.get(loserName);
                newMatch.map = existingMapCache.get(match.map);
                newMatch.eloPoint = match.elo;
                newMatch.format = match.format;
                newMatch.memo = match.memo;
                newMatch.uniqueHash = matchHash;
                newMatch.origin = origin;

                newMatchesByHash.set(matchHash, newMatch);
              }
            }
          }

          // 5. 삭제된 매치 처리
          for (const existingMatch of existingMatches) {
            if (
              existingMatch.origin === origin &&
              !newMatchesSet.has(existingMatch.uniqueHash)
            ) {
              // 이력 기록
              const history = new StarCraftGameMatchHistory();
              history.matchId = existingMatch.id;
              history.changeTimestamp = new Date();
              history.previousHash = existingMatch.uniqueHash;
              history.newHash = '';
              history.previousData = {
                date: existingMatch.date,
                winner: existingMatch.winner.name,
                loser: existingMatch.loser.name,
                map: existingMatch.map.name,
                format: existingMatch.format,
                memo: existingMatch.memo,
                eloPoint: existingMatch.eloPoint,
              };
              history.newData = null;
              history.changeType = 'DELETE';

              await historyRepository.save(history);
              await manager.remove(existingMatch);
            }
          }

          // 6. 새로운 매치 처리
          const existingMatchesByHash = new Map(
            existingMatches.map((m) => [m.uniqueHash, m]),
          );

          for (const [hash, newMatch] of newMatchesByHash.entries()) {
            const existingMatch = existingMatchesByHash.get(hash);

            if (!existingMatch) {
              // 새로운 매치 추가
              const savedMatch = await manager.save(newMatch);
              totalSaved++;

              // 이력 기록
              const history = new StarCraftGameMatchHistory();
              history.matchId = savedMatch.id;
              history.changeTimestamp = new Date();
              history.previousHash = '';
              history.newHash = hash;
              history.previousData = null;
              history.newData = {
                date: savedMatch.date,
                winner: savedMatch.winner.name,
                loser: savedMatch.loser.name,
                map: savedMatch.map.name,
                format: savedMatch.format,
                memo: savedMatch.memo,
                eloPoint: savedMatch.eloPoint,
              };
              history.changeType = 'CREATE';

              await historyRepository.save(history);
            }
          }

          console.log(
            `Processed ${dateMatches.length} matches for date ${date}`,
          );
        },
      );
    }

    return totalSaved;
  }

  /** 씨나인 사이트에서 스트리머 이름을 통해 숲ID 찾기*/
  private async getAllStreamersInfo(): Promise<Map<string, string | null>> {
    let browser;
    try {
      browser = await chromium.launch({
        headless: false,
        devtools: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          // User-Agent 설정
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        ],
      });

      const page = await browser.newPage();
      page.on('console', (msg) => console.log('브라우저:', msg.text()));

      console.log('페이지 로딩 시작...');
      const response = await page.goto('https://www.cnine.kr/starcraft/tier', {
        timeout: this.LOAD_TIMEOUT,
        waitUntil: 'networkidle',
      });

      if (!response || !response.ok()) {
        console.error(`페이지 로드 실패: ${response?.status()}`);
        return new Map();
      }

      await page.click('#switch-13', { force: true });
      await page.waitForTimeout(2000);
      await this.smoothScroll(page);

      console.log('스트리머 정보 수집 시작...');
      const streamersInfo = await page.evaluate(() => {
        const result: Record<string, string> = {};
        // v-col v-col-12 mt-10 클래스를 가진 요소 내의 game-player-card 찾기
        const cards = document
          .querySelector('.v-col.v-col-12.mt-10')
          ?.querySelectorAll('.game-player-card');

        console.log('찾은 카드 수:', cards?.length || 0);

        if (!cards) {
          console.log('카드를 찾을 수 없습니다');
          return result;
        }

        cards.forEach((card) => {
          const nicknameElement = card.querySelector(
            '.player-bottom .text-icon-75',
          );
          const imgElement = card.querySelector('.player-image-wrap img');

          if (nicknameElement && imgElement) {
            const nickname = nicknameElement.textContent.trim().split(' ')[0];
            const imgSrc = imgElement.getAttribute('src');
            if (nickname && imgSrc) {
              console.log(`스트리머 발견: ${nickname}`);
              result[nickname] = imgSrc;
            }
          }
        });

        return result;
      });

      console.log(
        `총 ${Object.keys(streamersInfo).length}명의 스트리머 정보 수집 완료`,
      );

      // 타입을 명시적으로 지정하여 Map 생성
      const streamersMap = new Map<string, string | null>();

      // 각 엔트리를 순회하면서 Map에 추가
      Object.entries(streamersInfo).forEach(([name, imgUrl]) => {
        const soopId = this.extractChannelIdFromProfileImage(imgUrl as string);
        if (soopId) {
          streamersMap.set(name, soopId);
        }
      });

      return streamersMap;
    } catch (error) {
      console.error('스트리머 정보 수집 중 에러 발생:', error);
      return new Map();
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private extractChannelIdFromProfileImage(
    profileImageUrl: string,
  ): string | null {
    try {
      // URL 패턴: //profile.img.sooplive.co.kr/LOGO/yo/yoo376/yoo376.jpg
      const matches = profileImageUrl.match(/\/LOGO\/\w+\/(\w+)\/\1\.jpg$/);
      if (matches && matches[1]) {
        return matches[1];
      }
      return null;
    } catch (error) {
      console.error('채널 ID 추출 실패:', error);
      return null;
    }
  }

  async updateAllStreamersSoopId(): Promise<void> {
    try {
      // 모든 스트리머 정보를 한 번에 가져옴
      const streamersInfo = await this.getAllStreamersInfo();
      console.log(`크롤링된 스트리머 수: ${streamersInfo.size}`);

      // DB의 모든 스트리머 조회
      const streamers = await this.streamerRepository.find({
        where: {
          soopId: IsNull(), // soopId가 없는 스트리머만 조회하거나
          // soopId: Any  // 모든 스트리머를 조회할 경우
        },
      });

      console.log(`DB의 스트리머 수: ${streamers.length}`);

      // 각 스트리머 정보 업데이트
      for (const streamer of streamers) {
        const soopId = streamersInfo.get(streamer.name);

        if (soopId) {
          await this.streamerRepository.update(
            { id: streamer.id },
            {
              soopId,
            },
          );
          console.log(
            `✅ ${streamer.name}의 soopId를 ${soopId}로 업데이트 완료`,
          );
        } else {
          console.log(`❌ ${streamer.name}의 soopId를 찾을 수 없음`);
        }
      }

      console.log('모든 스트리머 정보 업데이트 완료');
    } catch (error) {
      console.error('스트리머 일괄 업데이트 실패:', error);
      throw error;
    }
  }

  // 실제 사용자 마우스 스크롤처럼 동작하는 메서드
  private async smoothScroll(page: any): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100; // 한 번에 스크롤할 픽셀 단위
        const scrollInterval = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance); // 현재 스크롤 위치에서 아래로 distance만큼 스크롤
          totalHeight += distance;

          console.log(`스크롤 중... ${totalHeight}px / ${scrollHeight}px`);

          // 페이지 끝에 도달하거나 충분히 스크롤한 경우
          if (totalHeight >= scrollHeight) {
            clearInterval(scrollInterval);
            // 페이지의 맨 하단으로 한 번 더 스크롤
            window.scrollTo(0, document.body.scrollHeight);
            console.log('스크롤 완료');
            resolve();
          }
        }, 100); // 100ms마다 스크롤 (자연스러운 속도)
      });
    });

    // 모든 콘텐츠가 로드될 시간을 추가로 부여
    await page.waitForTimeout(3000);
  }

  // 락을 사용하지 않는 기본 크롤링 메서드 추가
  private async performCrawling(cacheKey: string, crewId?: number) {
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      await page.goto(
        this.configService.get('soop.loginUrl', { infer: true }),
        {
          timeout: this.LOAD_TIMEOUT,
          waitUntil: 'domcontentloaded',
        },
      );

      await page.fill(
        '#uid',
        this.configService.get('soop.id', { infer: true }),
        { force: true },
      );
      await page.fill(
        '#password',
        this.configService.get('soop.pw', { infer: true }),
        { force: true },
      );

      await page.click('.btn_login', { force: true });

      await page.waitForSelector('#btnNextTime', { timeout: 10000 });
      await page.click('#btnNextTime', { force: true });

      await page.goto(this.configService.get('soop.mainUrl', { infer: true }), {
        timeout: this.LOAD_TIMEOUT,
        waitUntil: 'domcontentloaded',
      });

      await this.loadAllContent(page);
      const allStreamInfos = await this.extractAllStreamInfo(page);

      // Filter streams based on crewId if provided
      const streamInfos = crewId
        ? await this.getFilteredStreamingData(allStreamInfos, crewId)
        : allStreamInfos;

      await page.close();

      const res = {
        streamInfos,
        totalCount: streamInfos.length,
      };

      // 캐시 저장
      await this.redisService.set(
        cacheKey,
        JSON.stringify(res),
        this.CACHE_TTL,
      );

      return res;
    } catch (error) {
      console.error('크롤링 실패:', error);
      throw new BadRequestException(`크롤링 실패: ${error.message}`);
    } finally {
      await this.closeBrowser();
    }
  }

  async getLiveCrewsInfo() {
    try {
      // 전체 라이브 스트리밍 데이터 가져오기
      const globalCachedData = (await this.redisService.get(
        this.CACHE_ALL_STREAM_KEY,
      )) as string;

      if (!globalCachedData) {
        return { crews: [] };
      }

      const allStreamData = JSON.parse(globalCachedData);
      const allLiveStreams = allStreamData.streamInfos || [];

      // 모든 크루 정보 가져오기
      const crews = await this.crewRepository.find({
        relations: ['members', 'members.rank'],
      });

      // 각 크루별로 라이브 스트리머 정보 계산
      const crewsInfo = await Promise.all(
        crews.map(async (crew) => {
          // 크루원 ID 목록 추출
          const memberIds = crew.members
            .map((member) => member.soopId)
            .filter(Boolean);

          // 대표 스트리머 찾기 (rank.level === 1인 멤버들)
          const representativeMemberIds = crew.members
            .filter((member) => member.rank?.level === 1 && member.soopId)
            .map((member) => member.soopId);

          // 해당 크루에 속한 라이브 스트리머 필터링
          const liveStreamers = allLiveStreams.filter((stream) => {
            const streamerId = stream.profileUrl.split('/').pop() || '';
            return memberIds.includes(streamerId);
          });

          // 크루 대표가 라이브 중인지 확인 (대표가 여러명일 수 있음)
          const isOwnerLive =
            representativeMemberIds.length > 0
              ? allLiveStreams.some((stream) => {
                  const streamerId = stream.profileUrl.split('/').pop() || '';
                  return representativeMemberIds.includes(streamerId);
                })
              : false;

          return {
            id: crew.id,
            liveStreamersCount: liveStreamers.length,
            isOwnerLive,
          };
        }),
      );

      return { crews: crewsInfo };
    } catch (error) {
      console.error('Error getting live crews info:', error);
      return { crews: [] };
    }
  }
}
