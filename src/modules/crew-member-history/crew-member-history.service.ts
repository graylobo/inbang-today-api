import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CrewMemberHistory,
  CrewMemberEventType,
} from '../../entities/crew-member-history.entity';
import { Streamer } from '../../entities/streamer.entity';
import { Crew } from '../../entities/crew.entity';

export interface CreateCrewMemberHistoryDto {
  streamerId: number;
  crewId: number;
  eventType: 'join' | 'leave';
  eventDate: string;
  note: string;
}

@Injectable()
export class CrewMemberHistoryService {
  constructor(
    @InjectRepository(CrewMemberHistory)
    private readonly crewMemberHistoryRepository: Repository<CrewMemberHistory>,
    @InjectRepository(Streamer)
    private readonly streamerRepository: Repository<Streamer>,
    @InjectRepository(Crew)
    private readonly crewRepository: Repository<Crew>,
  ) {}

  async create(
    createDto: CreateCrewMemberHistoryDto,
  ): Promise<CrewMemberHistory> {
    const { streamerId, crewId, eventType, eventDate, note } = createDto;

    // Find the streamer and crew
    const streamer = await this.streamerRepository.findOne({
      where: { id: streamerId },
    });
    const crew = await this.crewRepository.findOne({
      where: { id: crewId },
    });

    if (!streamer || !crew) {
      throw new Error('Streamer or crew not found');
    }

    // Create the history entry
    const history = this.crewMemberHistoryRepository.create({
      streamer,
      crew,
      eventType:
        eventType === 'join'
          ? CrewMemberEventType.JOIN
          : CrewMemberEventType.LEAVE,
      eventDate: new Date(eventDate),
      note,
    });

    return this.crewMemberHistoryRepository.save(history);
  }

  async findAllByStreamerId(streamerId: number): Promise<CrewMemberHistory[]> {
    return this.crewMemberHistoryRepository.find({
      where: { streamer: { id: streamerId } },
      relations: ['streamer', 'crew'],
      order: { eventDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findAllByCrewId(crewId: number): Promise<CrewMemberHistory[]> {
    return this.crewMemberHistoryRepository.find({
      where: { crew: { id: crewId } },
      relations: ['streamer', 'crew'],
      order: { eventDate: 'DESC', createdAt: 'DESC' },
    });
  }
}
