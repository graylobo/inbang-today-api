import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Streamer } from '../../entities/streamer.entity';
import { CrewMemberController } from 'src/modules/streamer/streamer.controller';
import { CrewMemberService } from 'src/modules/streamer/streamer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Streamer])],
  providers: [CrewMemberService],
  controllers: [CrewMemberController],
  exports: [CrewMemberService],
})
export class CrewMemberModule {}
