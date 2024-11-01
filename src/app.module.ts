import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CrewMember } from './entities/crew-member.entity';
import { CrewRank } from './entities/crew-rank.entity';
import { CrewEarning } from './entities/crew-earning.entity';
import { Crew } from './entities/crew.entity';
import { CrewModule } from './modules/crew/crew.module';
import { CrewMemberModule } from './modules/crew-member/crew-member.module';
import { CrewRankModule } from './modules/crew-rank/crew-rank.module';
import { CrewEarningModule } from './modules/crew-earning/crew-earning.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'inbang',
      entities: [Crew, CrewMember, CrewRank, CrewEarning],
      synchronize: true,
      // logging: true, // SQL 쿼리 로깅 활성화
    }),
    CrewModule,
    CrewMemberModule,
    CrewRankModule,
    CrewEarningModule,
  ],
})
export class AppModule {}
