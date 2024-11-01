import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrewRank } from '../../entities/crew-rank.entity';

@Injectable()
export class CrewRankService {
  constructor(
    @InjectRepository(CrewRank)
    private crewRankRepository: Repository<CrewRank>,
  ) {}

  async findAllByCrewId(crewId: number): Promise<CrewRank[]> {
    return this.crewRankRepository.find({
      where: { crew: { id: crewId } },
      order: { level: 'ASC' },
      relations: ['members'],
    });
  }

  async create(rankData: Partial<CrewRank>): Promise<CrewRank> {
    const rank = this.crewRankRepository.create(rankData);
    return this.crewRankRepository.save(rank);
  }

  async update(id: number, rankData: Partial<CrewRank>): Promise<CrewRank> {
    await this.crewRankRepository.update(id, rankData);
    return this.crewRankRepository.findOne({
      where: { id },
      relations: ['members'],
    });
  }

  async delete(id: number): Promise<void> {
    await this.crewRankRepository.delete(id);
  }
} 