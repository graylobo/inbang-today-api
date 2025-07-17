import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SoopAuthController } from './soop-auth.controller';
import { SoopAuthService } from './soop-auth.service';
import { User } from '../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User]), HttpModule],
  controllers: [SoopAuthController],
  providers: [SoopAuthService],
  exports: [SoopAuthService],
})
export class SoopAuthModule {}
