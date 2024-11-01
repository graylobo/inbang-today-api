import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrewEarning } from '../../entities/crew-earning.entity';

@Injectable()
export class CrewEarningService {
  constructor(
    @InjectRepository(CrewEarning)
    private crewEarningRepository: Repository<CrewEarning>,
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
    return this.crewEarningRepository
      .createQueryBuilder('earning')
      .leftJoinAndSelect('earning.member', 'member')
      .leftJoinAndSelect('member.crew', 'crew')
      .where('crew.id = :crewId', { crewId })
      .andWhere('earning.earningDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();
  }
}
