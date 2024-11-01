import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrewEarning } from '../../entities/crew-earning.entity';
import { CrewEarningController } from 'src/modules/crew-earning/crew-earning.controller';
import { CrewEarningService } from 'src/modules/crew-earning/crew-earning.service';

@Module({
  imports: [TypeOrmModule.forFeature([CrewEarning])],
  providers: [CrewEarningService],
  controllers: [CrewEarningController],
  exports: [CrewEarningService],
})
export class CrewEarningModule {}
