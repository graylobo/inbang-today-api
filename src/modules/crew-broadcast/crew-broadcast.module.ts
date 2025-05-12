import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrewBroadcast } from '../../entities/crew-broadcast.entity';
import { CrewBroadcastService } from './crew-broadcast.service';
import { CrewBroadcastController } from './crew-broadcast.controller';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [TypeOrmModule.forFeature([CrewBroadcast]), PointsModule],
  providers: [CrewBroadcastService],
  controllers: [CrewBroadcastController],
  exports: [CrewBroadcastService],
})
export class CrewBroadcastModule {}
