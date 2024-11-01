import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Crew } from '../../entities/crew.entity';
import { CrewEarning } from '../../entities/crew-earning.entity';

@Injectable()
export class CrewService {
  constructor(
    @InjectRepository(Crew)
    private crewRepository: Repository<Crew>,
    @InjectRepository(CrewEarning)
    private crewEarningRepository: Repository<CrewEarning>,
  ) {}

  async findAll(): Promise<Crew[]> {
    try {
      const crews = await this.crewRepository
        .createQueryBuilder('crew')
        .leftJoinAndSelect('crew.members', 'members')
        .leftJoinAndSelect('crew.ranks', 'ranks')
        .leftJoinAndSelect('members.rank', 'memberRank')
        .getMany();

      console.log('Query result:', JSON.stringify(crews, null, 2));
      return crews;
    } catch (error) {
      console.error('Error in findAll:', error);
      throw error;
    }
  }

  async findOne(id: number): Promise<Crew> {
    return this.crewRepository
      .createQueryBuilder('crew')
      .leftJoinAndSelect('crew.members', 'members')
      .leftJoinAndSelect('crew.ranks', 'ranks')
      .leftJoinAndSelect('members.rank', 'memberRank')
      .where('crew.id = :id', { id })
      .orderBy('ranks.level', 'ASC')
      .addOrderBy('members.name', 'ASC')
      .getOne();
  }

  async create(crewData: Partial<Crew>): Promise<Crew> {
    const crew = this.crewRepository.create(crewData);
    return this.crewRepository.save(crew);
  }

  async update(id: number, crewData: Partial<Crew>): Promise<Crew> {
    await this.crewRepository.update(id, crewData);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.crewRepository.delete(id);
  }

  async findAllWithMonthlyEarnings(
    year: number,
    month: number,
  ): Promise<any[]> {
    if (isNaN(year) || isNaN(month)) {
      throw new Error('Invalid year or month');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    console.log('Date range:', { startDate, endDate });

    const crews = await this.crewRepository
      .createQueryBuilder('crew')
      .leftJoinAndSelect('crew.members', 'members')
      .leftJoinAndSelect('crew.ranks', 'ranks')
      .leftJoinAndSelect('members.rank', 'memberRank')
      .getMany();

    const crewEarnings = await this.crewEarningRepository
      .createQueryBuilder('earning')
      .leftJoinAndSelect('earning.member', 'member')
      .leftJoinAndSelect('member.crew', 'crew')
      .where('earning.earningDate >= :startDate', { startDate })
      .andWhere('earning.earningDate <= :endDate', { endDate })
      .getMany();

    console.log('Earnings found:', crewEarnings.length);

    const crewsWithEarnings = crews.map((crew) => {
      const monthlyEarnings = crewEarnings
        .filter((earning) => earning.member.crew.id === crew.id)
        .reduce((sum, earning) => sum + Number(earning.amount), 0);

      return {
        ...crew,
        monthlyEarnings,
      };
    });

    return crewsWithEarnings.sort(
      (a, b) => b.monthlyEarnings - a.monthlyEarnings,
    );
  }
}
