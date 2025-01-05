import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StarCraftGameMatch } from 'src/entities/starcraft-game-match.entity';
import { Repository } from 'typeorm';
import { GetMatchHistoryDto } from './dto/get-match-history.dto';
import { GetStreamerStatsDto } from './dto/get-streamer-stats.dto';

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

@Injectable()
export class StarCraftGameMatchService {
  constructor(
    @InjectRepository(StarCraftGameMatch)
    private starCraftGameMatchRepository: Repository<StarCraftGameMatch>,
  ) {}

  async findMatches(query: GetMatchHistoryDto): Promise<StarCraftGameMatch[]> {
    const { streamerId, startDate, endDate, mapId } = query;

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

  async getStreamerStats(query: GetStreamerStatsDto): Promise<OpponentStats[]> {
    const queryBuilder = this.starCraftGameMatchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.winner', 'winner')
      .leftJoinAndSelect('match.loser', 'loser')
      .where('winner.id = :streamerId OR loser.id = :streamerId', {
        streamerId: query.streamerId,
      });

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('match.date BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    const matches = await queryBuilder.getMany();

    const opponentStats = new Map<number, OpponentStats>();

    matches.forEach((match) => {
      const isWinner = match.winner.id === query.streamerId;
      const opponent = isWinner ? match.loser : match.winner;

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

    return Array.from(opponentStats.values()).sort(
      (a, b) => b.totalGames - a.totalGames,
    );
  }
}
