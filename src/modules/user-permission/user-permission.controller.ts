import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UserPermissionService } from './user-permission.service';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';

@Controller('user-permissions')
@UseGuards(JwtAuthGuard)
export class UserPermissionController {
  constructor(private readonly userPermissionService: UserPermissionService) {}

  @Post()
  async assignPermission(
    @Body() assignPermissionDto: AssignPermissionDto,
    @CurrentUser() user: any,
  ) {
    const isSuperAdmin = await this.userPermissionService.isSuperAdmin(user);
    if (!isSuperAdmin) {
      throw new ForbiddenException('Only superAdmins can assign permissions');
    }

    return this.userPermissionService.assignCrewPermission(
      assignPermissionDto.userId,
      assignPermissionDto.crewId,
    );
  }

  @Delete(':userId/crew/:crewId')
  async removePermission(
    @Param('userId') userId: number,
    @Param('crewId') crewId: number,
    @User() user: any,
  ) {
    // Only superAdmins can remove permissions
    const isSuperAdmin = await this.userPermissionService.isSuperAdmin(
      user.userId,
    );
    if (!isSuperAdmin) {
      throw new ForbiddenException('Only superAdmins can remove permissions');
    }

    return this.userPermissionService.removeCrewPermission(userId, crewId);
  }

  @Get('user/:userId')
  async getUserPermissions(@Param('userId') userId: number, @User() user: any) {
    // SuperAdmin can see all permissions, users can only see their own
    const isSuperAdmin = await this.userPermissionService.isSuperAdmin(
      user.userId,
    );
    if (!isSuperAdmin && user.id !== +userId) {
      throw new ForbiddenException('You can only view your own permissions');
    }

    return this.userPermissionService.getUserPermissions(userId);
  }

  @Get('me/crews')
  async getMyPermittedCrews(@User() user: any) {
    return this.userPermissionService.getCrewsWithPermission(user.id);
  }

  @Get('check/:crewId')
  async checkCrewPermission(
    @Param('crewId') crewId: number,
    @User() user: any,
  ) {
    const hasPermission = await this.userPermissionService.hasPermissionForCrew(
      user.id,
      crewId,
    );
    return { hasPermission };
  }

  @Get('is-super-admin')
  async checkSuperAdmin(@User() user: any) {
    const isSuperAdmin = await this.userPermissionService.isSuperAdmin(user.id);
    return { isSuperAdmin };
  }
}
