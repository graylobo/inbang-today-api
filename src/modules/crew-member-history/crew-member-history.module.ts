import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrewMemberHistory } from '../../entities/crew-member-history.entity';
import { CrewMemberHistoryController } from 'src/modules/crew-member-history/crew-member-history.controller';
import { CrewMemberHistoryService } from './crew-member-history.service';
import { Streamer } from '../../entities/streamer.entity';
import { Crew } from '../../entities/crew.entity';
import { CrewRank } from '../../entities/crew-rank.entity';
import { User } from '../../entities/user.entity';
import { StreamerModule } from '../streamer/streamer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrewMemberHistory,
      Streamer,
      Crew,
      CrewRank,
      User,
    ]),
    StreamerModule,
  ],
  controllers: [CrewMemberHistoryController],
  providers: [CrewMemberHistoryService],
  exports: [CrewMemberHistoryService],
})
export class CrewMemberHistoryModule {}
