import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crew } from '../../entities/crew.entity';
import { CrewService } from './crew.service';
import { CrewController } from 'src/modules/crew/crew.controller';
import { CrewEarning } from 'src/entities/crew-earning.entity';
import { CrewRank } from 'src/entities/crew-rank.entity';
import { CrewBroadcast } from 'src/entities/crew-broadcast.entity';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Crew,
      CrewEarning,
      CrewRank,
      CrewBroadcast,
      User,
    ]),
  ],
  providers: [CrewService],
  controllers: [CrewController],
  exports: [CrewService],
})
export class CrewModule {}
