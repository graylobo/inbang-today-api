import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreamerEloRecord } from 'src/entities/streamer-elo-record.entity';
import { EloRankingController } from './elo-ranking.controller';
import { EloRankingService } from './elo-ranking.service';

@Module({
  imports: [TypeOrmModule.forFeature([StreamerEloRecord])],
  controllers: [EloRankingController],
  providers: [EloRankingService],
  exports: [EloRankingService],
})
export class EloRankingModule {}
