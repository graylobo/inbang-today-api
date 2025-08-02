import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Streamer } from '../../entities/streamer.entity';
import { Platform } from '../../entities/platform.entity';
import { StreamerPlatform } from '../../entities/streamer-platform.entity';
import { StreamerController } from 'src/modules/streamer/streamer.controller';
import { StreamerService } from 'src/modules/streamer/streamer.service';
import { CategoryModule } from '../category/category.module';
import { CrewRank } from '../../entities/crew-rank.entity';
import { Crew } from '../../entities/crew.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Streamer,
      CrewRank,
      Crew,
      Platform,
      StreamerPlatform,
    ]),
    CategoryModule,
  ],
  providers: [StreamerService],
  controllers: [StreamerController],
  exports: [StreamerService],
})
export class StreamerModule {}
