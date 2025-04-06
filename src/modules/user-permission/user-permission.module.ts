import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCrewPermission } from '../../entities/user-crew-permission.entity';
import { User } from '../../entities/user.entity';
import { Crew } from '../../entities/crew.entity';
import { UserPermissionService } from './user-permission.service';
import { UserPermissionController } from './user-permission.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserCrewPermission, User, Crew])],
  providers: [UserPermissionService],
  controllers: [UserPermissionController],
  exports: [UserPermissionService],
})
export class UserPermissionModule {}
