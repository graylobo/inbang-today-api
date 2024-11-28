import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { User } from './entities/user.entity';
import { CrewMember } from './entities/crew-member.entity';
import { CrewRank } from './entities/crew-rank.entity';
import { CrewEarning } from './entities/crew-earning.entity';
import { Crew } from './entities/crew.entity';
import { CrewModule } from './modules/crew/crew.module';
import { CrewMemberModule } from './modules/crew-member/crew-member.module';
import { CrewRankModule } from './modules/crew-rank/crew-rank.module';
import { CrewEarningModule } from './modules/crew-earning/crew-earning.module';
import { CrewBroadcastModule } from './modules/crew-broadcast/crew-broadcast.module';
import { CrewBroadcast } from './entities/crew-broadcast.entity';

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
      entities: [Crew, CrewMember, CrewRank, CrewEarning, User, CrewBroadcast],
      synchronize: true,
      // logging: true, // SQL 쿼리 로깅 활성화
    }),
    AuthModule,
    CrewModule,
    CrewMemberModule,
    CrewRankModule,
    CrewEarningModule,
    CrewBroadcastModule,
  ],
})
export class AppModule {}
