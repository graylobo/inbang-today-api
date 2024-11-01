import { DataSource } from 'typeorm';
import { Crew } from '../../entities/crew.entity';
import { CrewRank } from '../../entities/crew-rank.entity';
import { CrewMember } from '../../entities/crew-member.entity';

export async function seedInitialData(dataSource: DataSource) {
  // 크루 생성
  const crewRepository = dataSource.getRepository(Crew);
  const rankRepository = dataSource.getRepository(CrewRank);
  const memberRepository = dataSource.getRepository(CrewMember);

  // 크루 A 생성
  const crewA = await crewRepository.save({
    name: 'A크루',
    description: '회사 컨셉의 크루입니다.',
  });

  // 크루 A의 계급들
  const crewARanks = await rankRepository.save([
    { name: '대표', level: 1, crew: crewA },
    { name: '비서실장', level: 2, crew: crewA },
    { name: '부장', level: 3, crew: crewA },
    { name: '차장', level: 4, crew: crewA },
    { name: '과장', level: 5, crew: crewA },
    { name: '대리', level: 6, crew: crewA },
    { name: '사원', level: 7, crew: crewA },
  ]);

  // 크루 A의 멤버들
  await memberRepository.save([
    { name: '김대표', crew: crewA, rank: crewARanks[0] },
    { name: '이비서', crew: crewA, rank: crewARanks[1] },
    { name: '박부장', crew: crewA, rank: crewARanks[2] },
    { name: '최차장', crew: crewA, rank: crewARanks[3] },
    { name: '정과장', crew: crewA, rank: crewARanks[4] },
    { name: '강대리', crew: crewA, rank: crewARanks[5] },
    { name: '신사원', crew: crewA, rank: crewARanks[6] },
  ]);

  // 크루 B 생성
  const crewB = await crewRepository.save({
    name: 'B크루',
    description: '왕국 컨셉의 크루입니다.',
  });

  // 크루 B의 계급들
  const crewBRanks = await rankRepository.save([
    { name: '여왕', level: 1, crew: crewB },
    { name: '공주', level: 2, crew: crewB },
    { name: '귀족', level: 3, crew: crewB },
    { name: '기사', level: 4, crew: crewB },
    { name: '평민', level: 5, crew: crewB },
    { name: '농노', level: 6, crew: crewB },
  ]);

  // 크루 B의 멤버들
  await memberRepository.save([
    { name: '김여왕', crew: crewB, rank: crewBRanks[0] },
    { name: '이공주', crew: crewB, rank: crewBRanks[1] },
    { name: '박귀족', crew: crewB, rank: crewBRanks[2] },
    { name: '최기사', crew: crewB, rank: crewBRanks[3] },
    { name: '정평민', crew: crewB, rank: crewBRanks[4] },
    { name: '강농노', crew: crewB, rank: crewBRanks[5] },
  ]);
} 