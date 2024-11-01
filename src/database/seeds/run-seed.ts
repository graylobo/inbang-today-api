import { DataSource } from 'typeorm';
import { Crew } from '../../entities/crew.entity';
import { CrewRank } from '../../entities/crew-rank.entity';
import { CrewMember } from '../../entities/crew-member.entity';
import { CrewEarning } from '../../entities/crew-earning.entity';
import { seedInitialData } from './initial.seed';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'inbang',
  entities: [Crew, CrewMember, CrewRank, CrewEarning],
  synchronize: true,
});

async function main() {
  try {
    await dataSource.initialize();
    console.log('데이터베이스 연결 성공');

    await seedInitialData(dataSource);
    console.log('초기 데이터 생성 완료');

    await dataSource.destroy();
    console.log('데이터베이스 연결 종료');
  } catch (error) {
    console.error('에러 발생:', error);
    process.exit(1);
  }
}

main();
