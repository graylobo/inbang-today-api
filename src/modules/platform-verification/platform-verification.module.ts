import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Platform } from '../../entities/platform.entity';
import { UserPlatformVerification } from '../../entities/user-platform-verification.entity';
import { User } from '../../entities/user.entity';
import { PlatformVerificationService } from './platform-verification.service';
import { SoopVerificationService } from './services/soop-verification.service';
import { PlatformVerificationController } from 'src/modules/platform-verification/platform-verification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Platform, UserPlatformVerification, User]),
    HttpModule,
  ],
  providers: [PlatformVerificationService, SoopVerificationService],
  controllers: [PlatformVerificationController],
  exports: [PlatformVerificationService, SoopVerificationService],
})
export class PlatformVerificationModule {}
