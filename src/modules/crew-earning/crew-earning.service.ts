import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CrewEarning } from '../../entities/crew-earning.entity';
import { CrewBroadcast } from '../../entities/crew-broadcast.entity';

@Injectable()
export class CrewEarningService {
  constructor(
    @InjectRepository(CrewEarning)
    private crewEarningRepository: Repository<CrewEarning>,
    @InjectRepository(CrewBroadcast)
    private crewBroadcastRepository: Repository<CrewBroadcast>,
  ) {}

  async findByMemberAndDate(
    memberId: number,
    date: Date,
  ): Promise<CrewEarning[]> {
    return this.crewEarningRepository.find({
      where: {
        member: { id: memberId },
        earningDate: date,
      },
      relations: ['member'],
    });
  }

  async create(earningData: Partial<CrewEarning>): Promise<CrewEarning> {
    // 동일 날짜에 이미 등록된 수익이 있는지 확인
    const existingEarnings = await this.findByMemberAndDate(
      earningData.member.id,
      earningData.earningDate,
    );

    if (existingEarnings.length > 0) {
      throw new HttpException(
        'Earnings already registered for this date',
        HttpStatus.CONFLICT,
      );
    }

    const earning = this.crewEarningRepository.create(earningData);
    return this.crewEarningRepository.save(earning);
  }

  async reportEarning(id: number): Promise<void> {
    const earning = await this.crewEarningRepository.findOne({
      where: { id },
    });

    if (!earning) {
      throw new HttpException('Earning not found', HttpStatus.NOT_FOUND);
    }

    // 신고 횟수 증가
    earning.reportCount += 1;

    // 신고 횟수가 일정 수준 이상이면 검증 필요 상태로 변경
    if (earning.reportCount >= 3) {
      earning.isVerified = false;
    }

    await this.crewEarningRepository.save(earning);
  }

  async getCrewEarningsByDateRange(
    crewId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    // 크루 레벨 수익 조회
    const crewBroadcasts = await this.crewBroadcastRepository.find({
      where: {
        crew: { id: crewId },
        broadcastDate: Between(startDate, endDate),
      },
      relations: ['submittedBy'],
      order: { broadcastDate: 'DESC' },
    });

    // 멤버별 수익 조회
    const memberEarnings = await this.crewEarningRepository
      .createQueryBuilder('earning')
      .leftJoinAndSelect('earning.member', 'member')
      .leftJoinAndSelect('member.rank', 'rank')
      .leftJoinAndSelect('member.crew', 'crew')
      .leftJoinAndSelect('earning.submittedBy', 'submittedBy')
      .where('crew.id = :crewId', { crewId })
      .andWhere('earning.earningDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('earning.earningDate', 'DESC')
      .addOrderBy('rank.level', 'ASC')
      .getMany();

    // 날짜별로 수익 정보 병합
    const dailyEarnings = new Map();

    // 멤버별 수익을 먼저 처리
    memberEarnings.forEach((earning) => {
      const dateKey = new Date(earning.earningDate).toISOString().split('T')[0];
      if (!dailyEarnings.has(dateKey)) {
        dailyEarnings.set(dateKey, {
          date: dateKey,
          isBroadcastEarning: false,
          totalAmount: 0,
          earnings: [],
          broadcastEarning: null,
        });
      }
      const dailyData = dailyEarnings.get(dateKey);
      dailyData.earnings.push(earning);
      // 크루 방송 수익이 없는 경우에만 멤버 수익을 합산
      if (!dailyData.broadcastEarning) {
        dailyData.totalAmount += Math.floor(Number(earning.amount));
      }
    });

    // 크루 방송 수익 처리
    crewBroadcasts.forEach((broadcast) => {
      const dateKey = new Date(broadcast.broadcastDate)
        .toISOString()
        .split('T')[0];
      if (!dailyEarnings.has(dateKey)) {
        dailyEarnings.set(dateKey, {
          date: dateKey,
          isBroadcastEarning: false,
          totalAmount: 0,
          earnings: [],
          broadcastEarning: null,
        });
      }
      const dailyData = dailyEarnings.get(dateKey);
      dailyData.broadcastEarning = {
        totalAmount: Math.floor(Number(broadcast.totalAmount)),
        description: broadcast.description,
        submittedBy: broadcast.submittedBy,
        broadcastDuration: broadcast.broadcastDuration,
      };
      // 크루 방송 수익으로 총액 덮어쓰기
      dailyData.totalAmount = Math.floor(Number(broadcast.totalAmount));
    });

    return Array.from(dailyEarnings.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }
}
