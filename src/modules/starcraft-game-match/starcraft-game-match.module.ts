import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StarCraftGameMatch } from 'src/entities/starcraft-game-match.entity';
import { StarCraftGameMatchController } from './starcraft-game-match.controller';
import { StarCraftGameMatchService } from './services/starcraft-game-match.service';
import { Streamer } from 'src/entities/streamer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StarCraftGameMatch, Streamer])],
  controllers: [StarCraftGameMatchController],
  providers: [StarCraftGameMatchService],
  exports: [StarCraftGameMatchService],
})
export class StarCraftGameMatchModule {}
