import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrewRank } from '../../entities/crew-rank.entity';
import { CrewRankController } from 'src/modules/crew-rank/crew-rank.controller';
import { CrewRankService } from 'src/modules/crew-rank/crew-rank.service';

@Module({
  imports: [TypeOrmModule.forFeature([CrewRank])],
  providers: [CrewRankService],
  controllers: [CrewRankController],
  exports: [CrewRankService],
})
export class CrewRankModule {}
