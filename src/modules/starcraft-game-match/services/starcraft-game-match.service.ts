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

    const streamerStats = {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    };

    const opponentStats = new Map<number, OpponentStats>();

    matches.forEach((match) => {
      const isWinner = match.winner.id === Number(query.streamerId);
      const opponent = isWinner ? match.loser : match.winner;

      streamerStats.totalGames++;
      if (isWinner) {
        streamerStats.wins++;
      } else {
        streamerStats.losses++;
      }

      if (!opponentStats.has(opponent.id)) {
        opponentStats.set(opponent.id, {
          opponent: {
            id: opponent.id,
            name: opponent.name,
            race: opponent.race,
          },
          wins: 0,
          losses: 0,
          totalGames: 0,
          winRate: 0,
        });
      }

      const stats = opponentStats.get(opponent.id)!;
      if (isWinner) {
        stats.wins++;
      } else {
        stats.losses++;
      }
      stats.totalGames++;
      stats.winRate = (stats.wins / stats.totalGames) * 100;
    });

    streamerStats.winRate =
      streamerStats.totalGames > 0
        ? (streamerStats.wins / streamerStats.totalGames) * 100
        : 0;

    return {
      streamer: streamerStats,
      opponents: Array.from(opponentStats.values()).sort(
        (a, b) => b.totalGames - a.totalGames,
      ),
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
      gender: streamer.gender,
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
    // streamer 조회 조건 설정
    const streamerWhere: any = {};

    // gender 필터 적용
    if (query.gender) {
      streamerWhere.gender = query.gender;
    }

    // 먼저 모든 스트리머 조회 (gender 필터 적용)
    const streamers = await this.streamerRepository.find({
      where: streamerWhere,
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
      let gainedEloPoints = 0;
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

      const totalEloPoints = gainedEloPoints - lostEloPoints;
      const winRate = matchCount > 0 ? (wins / matchCount) * 100 : 0;

      // 결과 수집
      streamerEloStats.push({
        streamerId: streamer.id,
        streamerName: streamer.name,
        gender: streamer.gender,
        gainedEloPoints,
        lostEloPoints,
        totalEloPoints,
        matchCount,
        wins,
        losses,
        winRate,
      });
    }

    // 총 ELO 포인트 내림차순으로 정렬
    streamerEloStats.sort((a, b) => b.totalEloPoints - a.totalEloPoints);

    return {
      ranking: streamerEloStats,
      startDate: query.startDate,
      endDate: query.endDate,
      genderFilter: query.gender,
    };
  }
}
