import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Streamer } from '../../entities/streamer.entity';

@Injectable()
export class CrewMemberService {
  constructor(
    @InjectRepository(Streamer)
    private crewMemberRepository: Repository<Streamer>,
  ) {}

  async findAll(): Promise<Streamer[]> {
    return this.crewMemberRepository.find({
      relations: ['crew', 'rank'],
      order: {
        crew: { name: 'ASC' },
        rank: { level: 'ASC' },
      },
    });
  }

  async findAllByCrewId(crewId: number): Promise<Streamer[]> {
    return this.crewMemberRepository.find({
      where: { crew: { id: crewId } },
      relations: ['rank', 'crew'],
      order: { rank: { level: 'ASC' } },
    });
  }

  async findOne(id: number): Promise<Streamer> {
    return this.crewMemberRepository.findOne({
      where: { id },
      relations: ['rank', 'crew'],
    });
  }

  async create(memberData: any): Promise<Streamer> {
    const member = this.crewMemberRepository.create({
      name: memberData.name,
      profileImageUrl: memberData.profileImageUrl,
      broadcastUrl: memberData.broadcastUrl,
      crew: { id: memberData.crewId },
      rank: { id: memberData.rankId },
    });
    return this.crewMemberRepository.save(member);
  }

  async update(id: number, memberData: any): Promise<Streamer> {
    const updateData: any = {
      name: memberData.name,
      profileImageUrl: memberData.profileImageUrl,
      broadcastUrl: memberData.broadcastUrl,
    };

    if (memberData.crewId) {
      updateData.crew = { id: memberData.crewId };
    }

    if (memberData.rankId) {
      updateData.rank = { id: memberData.rankId };
    }

    await this.crewMemberRepository.update(id, updateData);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    try {
      const member = await this.crewMemberRepository.findOne({
        where: { id },
        relations: ['earnings'],
      });

      if (!member) {
        throw new NotFoundException('Member not found');
      }

      await this.crewMemberRepository.remove(member);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete member');
    }
  }
}
