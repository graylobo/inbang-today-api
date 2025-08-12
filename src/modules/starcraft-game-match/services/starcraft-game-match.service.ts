import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StarCraftGameMatch } from 'src/entities/starcraft-game-match.entity';
import { Repository } from 'typeorm';
import { GetMatchHistoryDto } from '../dto/get-match-history.dto';
import { GetStreamerStatsDto } from '../dto/get-streamer-stats.dto';
import { GetStreamerEloDto } from '../dto/get-streamer-elo-dto';
import { GetStreamerEloRankingDto } from '../dto/get-streamer-elo-ranking.dto';
import { Streamer } from 'src/entities/streamer.entity';

export interface OpponentStats {
  opponent: {
    id: number;
    name: string;
    race: string;
  };
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
}

export interface StreamerStatsResponse {
  streamer: {
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  opponents: OpponentStats[];
}

@Injectable()
export class StarCraftGameMatchService {
  constructor(
    @InjectRepository(StarCraftGameMatch)
    private starCraftGameMatchRepository: Repository<StarCraftGameMatch>,
    @InjectRepository(Streamer)
    private streamerRepository: Repository<Streamer>,
  ) {}

  async findMatches(query: GetMatchHistoryDto): Promise<StarCraftGameMatch[]> {
    const { streamerId, startDate, endDate, mapId, gender } = query;

    const queryBuilder = this.starCraftGameMatchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.winner', 'winner')
      .leftJoinAndSelect('match.loser', 'loser')
      .leftJoinAndSelect('match.map', 'map')
      .orderBy('match.date', 'DESC');

    if (streamerId) {
      queryBuilder.where(
        '(winner.id = :streamerId OR loser.id = :streamerId)',
        { streamerId },
      );
    }

    if (gender) {
      if (streamerId) {
        queryBuilder.andWhere(
          '((winner.id = :streamerId AND winner.gender = :gender) OR (loser.id = :streamerId AND loser.gender = :gender))',
          { streamerId, gender },
        );
      } else {
        queryBuilder.andWhere(
          '(winner.gender = :gender OR loser.gender = :gender)',
          { gender },
        );
      }
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('match.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (mapId) {
      queryBuilder.andWhere('map.id = :mapId', { mapId });
    }

    return queryBuilder.getMany();
  }

  async getStreamerStats(query: GetStreamerStatsDto) {
    const streamerId = Number(query.streamerId);

    // 전체 스트리머 합계 (wins/losses) 계산
    const totalsQb = this.starCraftGameMatchRepository
      .createQueryBuilder('match')
      .leftJoin('match.winner', 'winner')
      .leftJoin('match.loser', 'loser')
      .where('(winner.id = :streamerId OR loser.id = :streamerId)', {
        streamerId,
      })
      .select(
        `SUM(CASE WHEN winner.id = :streamerId THEN 1 ELSE 0 END)`,
        'wins',
      )
      .addSelect(
        `SUM(CASE WHEN loser.id = :streamerId THEN 1 ELSE 0 END)`,
        'losses',
      )
      .addSelect(`COUNT(*)`, 'total')
      .setParameters({ streamerId });

    if (query.startDate && query.endDate) {
      const startDateTime = new Date(query.startDate);
      startDateTime.setHours(0, 0, 0, 0);
      const endDateTime = new Date(query.endDate);
      endDateTime.setHours(23, 59, 59, 999);
      totalsQb.andWhere('match.date BETWEEN :startDate AND :endDate', {
        startDate: startDateTime,
        endDate: endDateTime,
      });
    }

    const rawTotals = (await totalsQb.getRawOne()) as
      | {
          wins?: string | number;
          losses?: string | number;
          total?: string | number;
        }
      | undefined;

    const streamerWins = Number(rawTotals?.wins ?? 0);
    const streamerLosses = Number(rawTotals?.losses ?? 0);
    const streamerTotal = Number(rawTotals?.total ?? 0);
    const streamerStats = {
      totalGames: streamerTotal,
      wins: streamerWins,
      losses: streamerLosses,
      winRate: streamerTotal > 0 ? (streamerWins / streamerTotal) * 100 : 0,
    };

    // 상대별 전적 집계 (방향성 보장)
    const opponentsQb = this.starCraftGameMatchRepository
      .createQueryBuilder('match')
      .leftJoin('match.winner', 'winner')
      .leftJoin('match.loser', 'loser')
      .leftJoin(
        'winner.gameProfiles',
        'winnerGameProfile',
        "winnerGameProfile.gameType = 'starcraft'",
      )
      .leftJoin(
        'loser.gameProfiles',
        'loserGameProfile',
        "loserGameProfile.gameType = 'starcraft'",
      )
      .where('(winner.id = :streamerId OR loser.id = :streamerId)', {
        streamerId,
      })
      // override default selection (avoid selecting match.* which breaks GROUP BY)
      .select(
        `CASE WHEN winner.id = :streamerId THEN loser.id ELSE winner.id END`,
        'opponent_id',
      )
      .addSelect(
        `CASE WHEN winner.id = :streamerId THEN loser.name ELSE winner.name END`,
        'opponent_name',
      )
      .addSelect(
        `SUM(CASE WHEN winner.id = :streamerId THEN 1 ELSE 0 END)`,
        'wins',
      )
      .addSelect(
        `SUM(CASE WHEN loser.id = :streamerId THEN 1 ELSE 0 END)`,
        'losses',
      )
      .addSelect(`COUNT(*)`, 'total_games')
      .addSelect(
        `CASE WHEN winner.id = :streamerId THEN loserGameProfile.race ELSE winnerGameProfile.race END`,
        'opponent_race',
      )
      .groupBy('opponent_id')
      .addGroupBy('opponent_name')
      .addGroupBy('opponent_race')
      .setParameters({ streamerId });

    if (query.startDate && query.endDate) {
      const startDateTime = new Date(query.startDate);
      startDateTime.setHours(0, 0, 0, 0);
      const endDateTime = new Date(query.endDate);
      endDateTime.setHours(23, 59, 59, 999);
      opponentsQb.andWhere('match.date BETWEEN :startDate AND :endDate', {
        startDate: startDateTime,
        endDate: endDateTime,
      });
    }

    const rows = await opponentsQb.getRawMany();
    const opponents: OpponentStats[] = rows.map((row) => {
      const wins = Number(row.wins) || 0;
      const losses = Number(row.losses) || 0;
      const totalGames = Number(row.total_games) || 0;
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
      return {
        opponent: {
          id: Number(row.opponent_id),
          name: row.opponent_name,
          race: row.opponent_race || null,
        },
        wins,
        losses,
        totalGames,
        winRate,
      };
    });

    // totalGames desc 정렬
    opponents.sort((a, b) => b.totalGames - a.totalGames);

    return {
      streamer: streamerStats,
      opponents,
    };
  }

  async getStreamerEloTotal(query: GetStreamerEloDto) {
    // 스트리머 정보 조회 (gender 필터링 포함)
    const streamer = await this.streamerRepository.findOne({
      where: {
        id: query.streamerId,
        ...(query.gender ? { gender: query.gender } : {}),
      },
    });

    // 스트리머가 없거나 gender 조건이 맞지 않으면 빈 결과 반환
    if (!streamer) {
      return {
        streamerId: query.streamerId,
        gender: query.gender,
        totalEloPoints: 0,
        gainedEloPoints: 0,
        lostEloPoints: 0,
        matchCount: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        startDate: query.startDate,
        endDate: query.endDate,
      };
    }

    const queryBuilder = this.starCraftGameMatchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.winner', 'winner')
      .leftJoinAndSelect('match.loser', 'loser')
      .where('(winner.id = :streamerId OR loser.id = :streamerId)', {
        streamerId: query.streamerId,
      });

    if (query.startDate && query.endDate) {
      const startDateTime = new Date(query.startDate);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(query.endDate);
      endDateTime.setHours(23, 59, 59, 999);

      queryBuilder.andWhere('match.date BETWEEN :startDate AND :endDate', {
        startDate: startDateTime,
        endDate: endDateTime,
      });
    }

    const matches = await queryBuilder.getMany();

    let gainedEloPoints = 0;
    let lostEloPoints = 0;
    let wins = 0;
    let losses = 0;

    matches.forEach((match) => {
      const isWinner = match.winner.id === Number(query.streamerId);
      if (isWinner) {
        gainedEloPoints += Number(match.eloPoint);
        wins++;
      } else {
        lostEloPoints += Number(match.eloPoint);
        losses++;
      }
    });

    const totalEloPoints = gainedEloPoints - lostEloPoints;
    const matchCount = matches.length;
    const winRate = matchCount > 0 ? (wins / matchCount) * 100 : 0;

    return {
      streamerId: query.streamerId,
      streamerName: streamer.name,
      gender: streamer.profile?.gender,
      totalEloPoints,
      gainedEloPoints,
      lostEloPoints,
      matchCount,
      wins,
      losses,
      winRate,
      startDate: query.startDate,
      endDate: query.endDate,
    };
  }

  async getStreamerEloRanking(query: GetStreamerEloRankingDto) {
    // 먼저 모든 스트리머 조회 (gender 필터 적용)
    const streamers = await this.streamerRepository.find({
      relations: ['profile'],
      where: query.gender ? { profile: { gender: query.gender } } : {},
    });

    // 각 스트리머별 ELO 포인트 집계를 위한 배열
    const streamerEloStats = [];

    // 매치 조회를 위한 기본 쿼리빌더
    const baseQueryBuilder = this.starCraftGameMatchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.winner', 'winner')
      .leftJoinAndSelect('match.loser', 'loser');

    // 날짜 필터 적용
    if (query.startDate && query.endDate) {
      const startDateTime = new Date(query.startDate);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(query.endDate);
      endDateTime.setHours(23, 59, 59, 999);

      baseQueryBuilder.andWhere('match.date BETWEEN :startDate AND :endDate', {
        startDate: startDateTime,
        endDate: endDateTime,
      });
    }

    // 모든 매치 데이터 조회
    const allMatches = await baseQueryBuilder.getMany();

    // 각 스트리머별로 ELO 포인트 집계
    for (const streamer of streamers) {
      let gainedEloPoints = 1000;
      let lostEloPoints = 0;
      let matchCount = 0;
      let wins = 0;
      let losses = 0;

      // 스트리머와 관련된 모든 매치 필터링
      const streamerMatches = allMatches.filter(
        (match) =>
          match.winner.id === streamer.id || match.loser.id === streamer.id,
      );

      // 각 매치에서 ELO 포인트 계산
      streamerMatches.forEach((match) => {
        const isWinner = match.winner.id === streamer.id;
        if (isWinner) {
          gainedEloPoints += Number(match.eloPoint);
          wins++;
        } else {
          lostEloPoints += Number(match.eloPoint);
          losses++;
        }
        matchCount++;
      });

      // 최소 경기 수 필터 적용
      if (query.minMatchCount && matchCount < query.minMatchCount) {
        continue;
      }

      const totalEloPoints = gainedEloPoints - lostEloPoints;
      const winRate = matchCount > 0 ? (wins / matchCount) * 100 : 0;

      // 신뢰도 계수 계산
      const confidenceScore = 1 - Math.exp(-matchCount / 100);

      // 최종 점수 계산
      // 승률(40%) + ELO 변화량(60%) * 신뢰도 계수
      const finalScore =
        (winRate * 0.4 + (totalEloPoints / Math.max(1, matchCount)) * 0.6) *
        confidenceScore;

      // 결과 수집
      streamerEloStats.push({
        streamerId: streamer.id,
        streamerName: streamer.name,
        gender: streamer.profile?.gender,
        gainedEloPoints,
        lostEloPoints,
        totalEloPoints,
        matchCount,
        wins,
        losses,
        winRate,
        confidenceScore,
        finalScore,
      });
    }

    // 최종 점수 내림차순으로 정렬
    streamerEloStats.sort((a, b) => b.finalScore - a.finalScore);

    return {
      ranking: streamerEloStats,
      startDate: query.startDate,
      endDate: query.endDate,
      genderFilter: query.gender,
      minMatchCount: query.minMatchCount,
    };
  }
}
