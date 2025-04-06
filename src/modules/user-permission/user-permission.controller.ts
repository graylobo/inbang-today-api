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
import { User } from 'src/common/decorators/user.decorator';

@Controller('user-permissions')
@UseGuards(JwtAuthGuard)
export class UserPermissionController {
  constructor(private readonly userPermissionService: UserPermissionService) {}

  @Post()
  async assignPermission(
    @Body() assignPermissionDto: AssignPermissionDto,
    @User() user: any,
  ) {
    // Only admins can assign permissions
    if (!user.isAdmin) {
      throw new ForbiddenException('Only admins can assign permissions');
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
    // Only admins can remove permissions
    if (!user.isAdmin) {
      throw new ForbiddenException('Only admins can remove permissions');
    }

    return this.userPermissionService.removeCrewPermission(userId, crewId);
  }

  @Get('user/:userId')
  async getUserPermissions(@Param('userId') userId: number, @User() user: any) {
    // Users can only see their own permissions, admins can see all
    if (!user.isAdmin && user.id !== +userId) {
      throw new ForbiddenException('You can only view your own permissions');
    }

    return this.userPermissionService.getUserPermissions(userId);
  }

  @Get('me/crews')
  async getMyPermittedCrews(@User() user: any) {
    // If user is admin, they have access to all crews
    if (user.isAdmin) {
      return this.userPermissionService.getAllCrews();
    }

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
}
