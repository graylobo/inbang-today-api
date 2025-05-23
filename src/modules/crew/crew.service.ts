import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Crew } from '../../entities/crew.entity';
import { CrewRank } from '../../entities/crew-rank.entity';
import { CrewEarning } from '../../entities/crew-earning.entity';
import { CrewBroadcast } from '../../entities/crew-broadcast.entity';

@Injectable()
export class CrewService {
  constructor(
    @InjectRepository(Crew)
    private crewRepository: Repository<Crew>,
    @InjectRepository(CrewRank)
    private crewRankRepository: Repository<CrewRank>,
    @InjectRepository(CrewEarning)
    private crewEarningRepository: Repository<CrewEarning>,
    @InjectRepository(CrewBroadcast)
    private crewBroadcastRepository: Repository<CrewBroadcast>,
  ) {}

  async findAll(): Promise<Crew[]> {
    try {
      const crews = await this.crewRepository
        .createQueryBuilder('crew')
        .leftJoinAndSelect('crew.members', 'members')
        .leftJoinAndSelect('crew.ranks', 'ranks')
        .leftJoinAndSelect('members.rank', 'memberRank')
        .getMany();

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

  async create(crewData: any): Promise<Crew> {
    // 이름 중복 검사
    const existingCrew = await this.crewRepository.findOne({
      where: { name: crewData.name },
    });

    if (existingCrew) {
      throw new HttpException('Crew name already exists', HttpStatus.CONFLICT);
    }

    const { ranks, ...crewInfo } = crewData;

    // 크루 생성 및 저장
    const newCrew = this.crewRepository.create(crewInfo);
    const savedCrew = (await this.crewRepository.save(
      newCrew,
    )) as unknown as Crew;

    // 계급 생성
    if (ranks && ranks.length > 0) {
      const rankEntities = ranks.map((rank) =>
        this.crewRankRepository.create({
          ...rank,
          crew: savedCrew,
        }),
      );
      await this.crewRankRepository.save(rankEntities);
    }

    return this.findOne(savedCrew.id);
  }

  async update(id: number, crewData: any): Promise<Crew> {
    // 이름이 변경되는 경우에만 중복 검사
    if (crewData.name) {
      const existingCrew = await this.crewRepository.findOne({
        where: { name: crewData.name },
      });

      if (existingCrew && existingCrew.id !== id) {
        throw new HttpException(
          'Crew name already exists',
          HttpStatus.CONFLICT,
        );
      }
    }

    const { ranks, ...crewInfo } = crewData;

    // 크루 정보 업데이트
    await this.crewRepository.update(id, crewInfo);

    if (ranks) {
      // 기존 랭크 조회
      const existingRanks = await this.crewRankRepository.find({
        where: { crew: { id } },
        relations: ['crew'],
      });

      // 스트리머가 사용 중인 랭크 ID 조회
      const usedRankIds = await this.checkRanksInUse(id);

      if (ranks.length > 0) {
        // 새 랭크와 기존 랭크 매핑
        const existingRankMap = new Map(
          existingRanks.map((rank) => [rank.id, rank]),
        );

        // 업데이트할 랭크와 새로 추가할 랭크 분리
        const ranksToUpdate = [];
        const ranksToAdd = [];

        for (const rankData of ranks) {
          if (rankData.id && existingRankMap.has(rankData.id)) {
            // 기존 랭크 업데이트
            ranksToUpdate.push({
              id: rankData.id,
              name: rankData.name,
              level: rankData.level,
              commission: rankData.commission,
              iconUrl: rankData.iconUrl,
            });
          } else {
            // 새 랭크 추가
            ranksToAdd.push(
              this.crewRankRepository.create({
                ...rankData,
                crew: { id },
              }),
            );
          }
        }

        // 업데이트할 랭크가 있으면 업데이트
        for (const rankUpdate of ranksToUpdate) {
          await this.crewRankRepository.update(rankUpdate.id, rankUpdate);
        }

        // 새 랭크 추가
        if (ranksToAdd.length > 0) {
          await this.crewRankRepository.save(ranksToAdd);
        }

        // 삭제할 랭크 찾기 (요청에 포함되지 않은 기존 랭크)
        const newRankIds = ranks.filter((r) => r.id).map((r) => r.id);
        const ranksToRemove = existingRanks.filter(
          (rank) =>
            !newRankIds.includes(rank.id) && !usedRankIds.includes(rank.id),
        );

        // 사용 중이지 않은 랭크만 삭제
        if (ranksToRemove.length > 0) {
          await this.crewRankRepository.remove(ranksToRemove);
        }
      }
    }

    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.crewRepository.delete(id);
  }

  async findAllWithMonthlyEarnings(
    year: number,
    month: number,
  ): Promise<any[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const crews = await this.crewRepository
      .createQueryBuilder('crew')
      .leftJoinAndSelect('crew.members', 'members')
      .leftJoinAndSelect('crew.ranks', 'ranks')
      .leftJoinAndSelect('members.rank', 'memberRank')
      .getMany();

    // 크루 레벨 수익 조회
    const crewBroadcasts = await this.crewBroadcastRepository.find({
      where: {
        broadcastDate: Between(startDate, endDate),
      },
      relations: ['crew'],
    });

    // 멤버별 수익 조회
    const memberEarnings = await this.crewEarningRepository
      .createQueryBuilder('earning')
      .leftJoinAndSelect('earning.member', 'member')
      .leftJoinAndSelect('member.crew', 'crew')
      .where('earning.earningDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    // 날짜별 수익 계산을 위한 맵 생성
    const crewDailyEarnings = new Map<string, Map<number, number>>();

    // 크루 레벨 수익을 먼저 처리 (우선순위가 높음)
    crewBroadcasts.forEach((broadcast) => {
      const dateKey = new Date(broadcast.broadcastDate)
        .toISOString()
        .split('T')[0];
      if (!crewDailyEarnings.has(dateKey)) {
        crewDailyEarnings.set(dateKey, new Map());
      }
      crewDailyEarnings
        .get(dateKey)
        ?.set(broadcast.crew.id, Number(broadcast.totalAmount));
    });

    // 멤버별 수익은 해당 날짜에 크루 레벨 수익이 없는 경우에만 처리
    memberEarnings.forEach((earning) => {
      const dateKey = new Date(earning.earningDate).toISOString().split('T')[0];
      const crewId = earning.member.crew.id;

      if (!crewDailyEarnings.has(dateKey)) {
        crewDailyEarnings.set(dateKey, new Map());
      }

      const dailyMap = crewDailyEarnings.get(dateKey)!;
      if (!dailyMap.has(crewId)) {
        // 해당 날짜에 크루 레벨 수익이 없는 경우에만 멤버 수익을 더함
        dailyMap.set(
          crewId,
          (dailyMap.get(crewId) || 0) + Number(earning.amount),
        );
      }
    });

    // 크루별 총 수익 계산
    const crewsWithEarnings = crews.map((crew) => {
      let monthlyEarnings = 0;
      crewDailyEarnings.forEach((dailyMap) => {
        if (dailyMap.has(crew.id)) {
          monthlyEarnings += dailyMap.get(crew.id) || 0;
        }
      });

      return {
        ...crew,
        monthlyEarnings,
      };
    });

    return crewsWithEarnings.sort(
      (a, b) => b.monthlyEarnings - a.monthlyEarnings,
    );
  }

  // 스트리머가 사용 중인 랭크 ID 확인
  private async checkRanksInUse(crewId: number): Promise<number[]> {
    const result = await this.crewRepository
      .createQueryBuilder('crew')
      .leftJoinAndSelect('crew.members', 'members')
      .leftJoinAndSelect('members.rank', 'rank')
      .where('crew.id = :crewId', { crewId })
      .getOne();

    if (!result || !result.members || result.members.length === 0) {
      return [];
    }

    // 스트리머가 사용 중인 랭크 ID 수집
    return result.members
      .filter((member) => member.rank && member.rank.id)
      .map((member) => member.rank.id);
  }
}
