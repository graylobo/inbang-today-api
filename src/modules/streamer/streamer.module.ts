import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Streamer } from '../../entities/streamer.entity';
import { StreamerController } from 'src/modules/streamer/streamer.controller';
import { StreamerService } from 'src/modules/streamer/streamer.service';
import { CategoryModule } from '../category/category.module';
import { CrewRank } from '../../entities/crew-rank.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Streamer, CrewRank]), CategoryModule],
  providers: [StreamerService],
  controllers: [StreamerController],
  exports: [StreamerService],
})
export class StreamerModule {}
