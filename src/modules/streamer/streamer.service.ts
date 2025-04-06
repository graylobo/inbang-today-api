import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Streamer } from '../../entities/streamer.entity';
import { ErrorCode } from 'src/common/enums/error-codes.enum';

@Injectable()
export class StreamerService {
  constructor(
    @InjectRepository(Streamer)
    private streamerRepository: Repository<Streamer>,
  ) {}

  async findAll(): Promise<Streamer[]> {
    return this.streamerRepository.find({
      relations: ['crew', 'rank'],
      order: {
        crew: { name: 'ASC' },
        rank: { level: 'ASC' },
      },
    });
  }

  async findAllByCrewId(crewId: number): Promise<Streamer[]> {
    return this.streamerRepository.find({
      where: { crew: { id: crewId } },
      relations: ['rank', 'crew'],
      order: { rank: { level: 'ASC' } },
    });
  }

  async findOne(id: number): Promise<Streamer> {
    return this.streamerRepository.findOne({
      where: { id },
      relations: ['rank', 'crew'],
    });
  }

  async create(memberData: any): Promise<Streamer> {
    const existingStreamer = await this.streamerRepository.findOne({
      where: { name: memberData.name },
    });

    if (existingStreamer) {
      throw new BadRequestException(ErrorCode.DUPLICATE_NAME);
    }

    const member = this.streamerRepository.create({
      name: memberData.name,
      profileImageUrl: memberData.profileImageUrl,
      broadcastUrl: memberData.broadcastUrl,
      crew: { id: memberData.crewId },
      rank: { id: memberData.rankId },
    });
    return this.streamerRepository.save(member);
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

    await this.streamerRepository.update(id, updateData);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    try {
      const member = await this.streamerRepository.findOne({
        where: { id },
        relations: ['earnings'],
      });

      if (!member) {
        throw new NotFoundException('Member not found');
      }

      await this.streamerRepository.remove(member);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete member');
    }
  }
}
