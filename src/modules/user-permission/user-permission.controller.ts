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
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('user-permissions')
@UseGuards(JwtAuthGuard)
export class UserPermissionController {
  constructor(private readonly userPermissionService: UserPermissionService) {}

  @Post()
  async assignPermission(
    @Body() assignPermissionDto: AssignPermissionDto,
    @CurrentUser() user: any,
  ) {
    const isSuperAdmin = await this.userPermissionService.isSuperAdmin(
      user.userId,
    );
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
    @CurrentUser() user: any,
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
  async getUserPermissions(
    @Param('userId') userId: number,
    @CurrentUser() user: any,
  ) {
    // SuperAdmin can see all permissions, users can only see their own
    const isSuperAdmin = await this.userPermissionService.isSuperAdmin(
      user.userId,
    );
    if (!isSuperAdmin && user.userId !== +userId) {
      throw new ForbiddenException('You can only view your own permissions');
    }

    return this.userPermissionService.getUserPermissions(userId);
  }

  @Get('me/crews')
  async getMyPermittedCrews(@CurrentUser() user: any) {
    return this.userPermissionService.getCrewsWithPermission(user.userId);
  }

  @Get('check/:crewId')
  async checkCrewPermission(
    @Param('crewId') crewId: number,
    @CurrentUser() user: any,
  ) {
    const hasPermission = await this.userPermissionService.hasPermissionForCrew(
      user.userId,
      crewId,
    );
    return { hasPermission };
  }

  @Get('is-super-admin')
  async checkSuperAdmin(@CurrentUser() user: any) {
    const isSuperAdmin = await this.userPermissionService.isSuperAdmin(
      user.userId,
    );
    return { isSuperAdmin };
  }
}
