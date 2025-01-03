import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Streamer } from '../../entities/streamer.entity';
import { CrewMemberController } from 'src/modules/crew-member/crew-member.controller';
import { CrewMemberService } from 'src/modules/crew-member/crew-member.service';

@Module({
  imports: [TypeOrmModule.forFeature([Streamer])],
  providers: [CrewMemberService],
  controllers: [CrewMemberController],
  exports: [CrewMemberService],
})
export class CrewMemberModule {}
