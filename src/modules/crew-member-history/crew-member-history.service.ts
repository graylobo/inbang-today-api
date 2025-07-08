import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CrewMemberHistory,
  CrewMemberEventType,
} from '../../entities/crew-member-history.entity';
import { Streamer } from '../../entities/streamer.entity';
import { Crew } from '../../entities/crew.entity';
import { CrewRank } from '../../entities/crew-rank.entity';
import { User } from '../../entities/user.entity';

export interface CreateCrewMemberHistoryDto {
  streamerId: number;
  crewId: number;
  eventType: 'join' | 'leave' | 'rank_change';
  eventDate: string;
  note: string;
  oldRankId?: number;
  newRankId?: number;
  performedById?: number;
  isHistoricalEntry?: boolean;
}

export interface UpdateCrewMemberHistoryDto {
  eventDate?: string;
  note?: string;
  performedById?: number;
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
    @InjectRepository(CrewRank)
    private readonly crewRankRepository: Repository<CrewRank>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createDto: CreateCrewMemberHistoryDto,
  ): Promise<CrewMemberHistory> {
    const {
      streamerId,
      crewId,
      eventType,
      eventDate,
      note,
      oldRankId,
      newRankId,
      performedById,
    } = createDto;

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

    // 작업 수행자 정보 조회 (있는 경우)
    let performedBy = null;
    if (performedById) {
      performedBy = await this.userRepository.findOne({
        where: { id: performedById },
      });
    }

    // 이벤트 타입에 따른 enum 값 변환
    let eventTypeEnum: CrewMemberEventType;
    switch (eventType) {
      case 'join':
        eventTypeEnum = CrewMemberEventType.JOIN;
        break;
      case 'leave':
        eventTypeEnum = CrewMemberEventType.LEAVE;
        break;
      case 'rank_change':
        eventTypeEnum = CrewMemberEventType.RANK_CHANGE;
        break;
      default:
        throw new Error('Invalid event type');
    }

    // 중복 기록 체크: 동일 스트리머, 동일 크루, 동일 날짜, 동일 이벤트 타입인 기록 조회
    const existingHistory = await this.crewMemberHistoryRepository.findOne({
      where: {
        streamer: { id: streamerId },
        crew: { id: crewId },
        eventType: eventTypeEnum,
        eventDate: new Date(eventDate),
      },
      relations: ['streamer', 'crew', 'oldRank', 'newRank'],
    });

    // 직급 변경인 경우 rank 정보 조회
    let oldRank = null;
    let newRank = null;

    if (eventType === 'rank_change') {
      // 직급 변경 시 새 직급 ID는 필수
      if (!newRankId) {
        throw new Error('직급 변경 시 새 직급이 반드시 필요합니다.');
      }

      if (oldRankId) {
        oldRank = await this.crewRankRepository.findOne({
          where: { id: oldRankId },
          relations: ['crew'],
        });
      }

      newRank = await this.crewRankRepository.findOne({
        where: { id: newRankId },
        relations: ['crew'],
      });

      if (!newRank) {
        throw new Error(`새 직급 ID ${newRankId}를 찾을 수 없습니다.`);
      }

      // 새 직급이 해당 크루에 속하는지 확인
      if (newRank.crew.id !== crewId) {
        throw new Error(`선택한 새 직급은 해당 크루에 속하지 않습니다.`);
      }

      // 이전 직급도 같은 크루에 속하는지 확인 (있는 경우)
      if (oldRank && oldRank.crew.id !== crewId) {
        throw new Error(`이전 직급이 해당 크루에 속하지 않습니다.`);
      }
    }

    // 이미 동일한 기록이 존재하는 경우, 새 기록 생성 없이 기존 기록 반환
    if (existingHistory) {
      // 비고 및 직급 정보 업데이트
      if (note) {
        existingHistory.note = note;
      }

      if (eventType === 'rank_change') {
        existingHistory.oldRankId = oldRankId;
        existingHistory.newRankId = newRankId;
        existingHistory.oldRank = oldRank;
        existingHistory.newRank = newRank;
      }

      return this.crewMemberHistoryRepository.save(existingHistory);
    }

    // 동일한 기록이 없는 경우 새 기록 생성
    const history = this.crewMemberHistoryRepository.create({
      streamer,
      crew,
      eventType: eventTypeEnum,
      eventDate: new Date(eventDate),
      note,
      performedBy,
    });

    // 직급 변경인 경우 직급 정보 추가
    if (eventType === 'rank_change') {
      history.oldRankId = oldRankId;
      history.newRankId = newRankId;
      history.oldRank = oldRank;
      history.newRank = newRank;
    }
    // 입사인 경우에도 초기 직급 정보 기록
    else if (eventType === 'join') {
      // 입사 시 직급 ID는 필수
      if (!newRankId) {
        throw new Error('입사 처리 시 초기 직급이 반드시 필요합니다.');
      }

      // 새 직급 정보 조회 및 검증
      const newRank = await this.crewRankRepository.findOne({
        where: { id: newRankId },
        relations: ['crew'],
      });

      if (!newRank) {
        throw new Error(`직급 ID ${newRankId}를 찾을 수 없습니다.`);
      }

      // 선택된 직급이 해당 크루에 속하는지 확인
      if (newRank.crew.id !== crewId) {
        throw new Error(`선택한 직급은 해당 크루에 속하지 않습니다.`);
      }

      history.newRankId = newRankId;
      history.newRank = newRank;
      console.log(
        `스트리머(ID: ${streamerId})가 크루(ID: ${crewId})에 초기 직급(${newRank.name})으로 입사했습니다.`,
      );
    }

    return this.crewMemberHistoryRepository.save(history);
  }

  async update(
    id: number,
    updateDto: UpdateCrewMemberHistoryDto,
  ): Promise<CrewMemberHistory> {
    const history = await this.crewMemberHistoryRepository.findOne({
      where: { id },
      relations: ['streamer', 'crew', 'oldRank', 'newRank', 'performedBy'],
    });

    if (!history) {
      throw new NotFoundException(`히스토리 ID ${id}를 찾을 수 없습니다.`);
    }

    // 이벤트 날짜 업데이트
    if (updateDto.eventDate) {
      history.eventDate = new Date(updateDto.eventDate);
    }

    // 비고 업데이트
    if (updateDto.note !== undefined) {
      history.note = updateDto.note;
    }

    // 수행자 업데이트
    if (updateDto.performedById !== undefined) {
      if (updateDto.performedById) {
        const performedBy = await this.userRepository.findOne({
          where: { id: updateDto.performedById },
        });
        history.performedBy = performedBy;
      } else {
        history.performedBy = null;
      }
    }

    // 변경사항 저장
    await this.crewMemberHistoryRepository.save(history);
    return history;
  }

  async remove(id: number): Promise<void> {
    const history = await this.crewMemberHistoryRepository.findOne({
      where: { id },
    });

    if (!history) {
      throw new NotFoundException(`히스토리 ID ${id}를 찾을 수 없습니다.`);
    }

    await this.crewMemberHistoryRepository.remove(history);
  }

  async findAllByStreamerId(streamerId: number): Promise<CrewMemberHistory[]> {
    return this.crewMemberHistoryRepository.find({
      where: { streamer: { id: streamerId } },
      relations: ['streamer', 'crew', 'oldRank', 'newRank', 'performedBy'],
      order: { eventDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findAllByCrewId(crewId: number): Promise<CrewMemberHistory[]> {
    return this.crewMemberHistoryRepository.find({
      where: { crew: { id: crewId } },
      relations: ['streamer', 'crew', 'oldRank', 'newRank', 'performedBy'],
      order: { eventDate: 'DESC', createdAt: 'DESC' },
    });
  }
}
