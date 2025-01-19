import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StarCraftGameMatchHistory } from 'src/entities/starcraft-game-match-history.entity';
import { Repository, Between } from 'typeorm';

@Injectable()
export class StarCraftGameMatchHistoryService {
  constructor(
    @InjectRepository(StarCraftGameMatchHistory)
    private readonly historyRepository: Repository<StarCraftGameMatchHistory>,
  ) {}

  async getMatchHistory(matchId: number): Promise<StarCraftGameMatchHistory[]> {
    return this.historyRepository.find({
      where: { matchId },
      order: { changeTimestamp: 'DESC' },
    });
  }

  async getChangesInDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<StarCraftGameMatchHistory[]> {
    return this.historyRepository.find({
      where: {
        changeTimestamp: Between(startDate, endDate),
      },
      order: { changeTimestamp: 'DESC' },
    });
  }

  async getChangeStatistics(startDate: Date, endDate: Date) {
    const changes = await this.historyRepository
      .createQueryBuilder('history')
      .select('history.changeType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('history.changeTimestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('history.changeType')
      .getRawMany();

    return changes;
  }
}
