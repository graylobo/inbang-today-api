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
  rankId?: number;
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

    // 중복 기록 체크: 동일 스트리머, 동일 크루, 동일 날짜, 동일 이벤트 타입인 기록 조회
    const existingHistory = await this.crewMemberHistoryRepository.findOne({
      where: {
        streamer: { id: streamerId },
        crew: { id: crewId },
        eventType:
          eventType === 'join'
            ? CrewMemberEventType.JOIN
            : CrewMemberEventType.LEAVE,
        eventDate: new Date(eventDate),
      },
      relations: ['streamer', 'crew'],
    });

    // 이미 동일한 기록이 존재하는 경우, 새 기록 생성 없이 기존 기록 반환
    if (existingHistory) {
      // 비고만 업데이트
      if (note && note !== existingHistory.note) {
        existingHistory.note = note;
        return this.crewMemberHistoryRepository.save(existingHistory);
      }
      return existingHistory;
    }

    // 동일한 기록이 없는 경우 새 기록 생성
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
