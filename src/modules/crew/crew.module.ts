import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crew } from '../../entities/crew.entity';
import { CrewService } from './crew.service';
import { CrewController } from 'src/modules/crew/crew.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Crew])],
  providers: [CrewService],
  controllers: [CrewController],
  exports: [CrewService],
})
export class CrewModule {}
