import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrewMember } from '../../entities/crew-member.entity';

@Injectable()
export class CrewMemberService {
  constructor(
    @InjectRepository(CrewMember)
    private crewMemberRepository: Repository<CrewMember>,
  ) {}

  async findAllByCrewId(crewId: number): Promise<CrewMember[]> {
    return this.crewMemberRepository.find({
      where: { crew: { id: crewId } },
      relations: ['rank', 'crew'],
      order: { rank: { level: 'ASC' } },
    });
  }

  async findOne(id: number): Promise<CrewMember> {
    return this.crewMemberRepository.findOne({
      where: { id },
      relations: ['rank', 'crew'],
    });
  }

  async create(memberData: Partial<CrewMember>): Promise<CrewMember> {
    const member = this.crewMemberRepository.create(memberData);
    return this.crewMemberRepository.save(member);
  }

  async update(
    id: number,
    memberData: Partial<CrewMember>,
  ): Promise<CrewMember> {
    await this.crewMemberRepository.update(id, memberData);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.crewMemberRepository.delete(id);
  }
}
