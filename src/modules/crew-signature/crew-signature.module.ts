import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrewSignature } from '../../entities/crew-signature.entity';
import { CrewSignatureService } from './crew-signature.service';
import { CrewSignatureController } from './crew-signature.controller';
import { CrewSignatureDance } from 'src/entities/crew-signature-dance.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CrewSignature, CrewSignatureDance, User]),
  ],
  providers: [CrewSignatureService],
  controllers: [CrewSignatureController],
  exports: [CrewSignatureService],
})
export class CrewSignatureModule {}
