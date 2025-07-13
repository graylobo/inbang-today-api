import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserService } from './user.service';
import { UserController } from 'src/modules/user/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { AwsModule } from 'src/modules/aws/aws.module';
import { ImageProcessingModule } from 'src/modules/image-processing/image-processing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule,
    AwsModule,
    ImageProcessingModule,
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
