import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrewRank } from '../../entities/crew-rank.entity';
import { CrewRankService } from './crew-rank.service';
import { CrewRankController } from './crew-rank.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CrewRank])],
  providers: [CrewRankService],
  controllers: [CrewRankController],
  exports: [CrewRankService],
})
export class CrewRankModule {}
