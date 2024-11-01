import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Crew } from '../../entities/crew.entity';

@Injectable()
export class CrewService {
  constructor(
    @InjectRepository(Crew)
    private crewRepository: Repository<Crew>,
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
    return this.crewRepository.findOne({
      where: { id },
      relations: ['members', 'ranks'],
    });
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
}
