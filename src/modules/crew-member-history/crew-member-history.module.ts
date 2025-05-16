import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrewMemberHistory } from '../../entities/crew-member-history.entity';
import { CrewMemberHistoryService } from './crew-member-history.service';
import { Streamer } from '../../entities/streamer.entity';
import { Crew } from '../../entities/crew.entity';
import { CrewMemberHistoryController } from 'src/modules/crew-member-history/crew-member-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CrewMemberHistory, Streamer, Crew])],
  controllers: [CrewMemberHistoryController],
  providers: [CrewMemberHistoryService],
  exports: [CrewMemberHistoryService],
})
export class CrewMemberHistoryModule {}
