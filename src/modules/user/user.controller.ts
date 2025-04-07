import {
  Controller,
  Get,
  UseGuards,
  Param,
  Patch,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { UserService } from 'src/modules/user/user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() userId: number) {
    try {
      const user = await this.userService.findById(userId);
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      console.error('Profile error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers(@CurrentUser() userId: number) {
    try {
      const currentUser = await this.userService.findById(userId);
      if (!currentUser.isSuperAdmin) {
        return {
          success: false,
          message: '관리자만 접근 가능합니다.',
        };
      }

      const users = await this.userService.findAll();
      return users;
    } catch (error) {
      console.error('Get all users error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':userId/admin')
  async toggleAdminStatus(
    @CurrentUser() userId: number,
    @Param('userId') targetUserId: number,
    @Body() data: { isAdmin: boolean },
  ) {
    try {
      const currentUser = await this.userService.findById(userId);

      // 슈퍼 관리자만 관리자 권한을 토글할 수 있음
      if (!currentUser.isSuperAdmin) {
        throw new ForbiddenException(
          '슈퍼 관리자만 관리자 권한을 변경할 수 있습니다.',
        );
      }

      return await this.userService.updateAdminStatus(
        targetUserId,
        data.isAdmin,
      );
    } catch (error) {
      console.error('Toggle admin status error:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':userId/super-admin')
  async toggleSuperAdminStatus(
    @CurrentUser() userId: number,
    @Param('userId') targetUserId: number,
    @Body() data: { isSuperAdmin: boolean },
  ) {
    try {
      const currentUser = await this.userService.findById(userId);

      // 슈퍼 관리자만 다른 슈퍼 관리자 권한을 토글할 수 있음
      if (!currentUser.isSuperAdmin) {
        throw new ForbiddenException(
          '슈퍼 관리자만 슈퍼 관리자 권한을 변경할 수 있습니다.',
        );
      }

      // 자기 자신의 슈퍼 관리자 권한은 제거할 수 없음 (최소 1명의 슈퍼 관리자가 필요)
      if (Number(targetUserId) === userId && !data.isSuperAdmin) {
        throw new ForbiddenException(
          '자신의 슈퍼 관리자 권한은 제거할 수 없습니다.',
        );
      }

      return await this.userService.updateSuperAdminStatus(
        targetUserId,
        data.isSuperAdmin,
      );
    } catch (error) {
      console.error('Toggle super admin status error:', error);
      throw error;
    }
  }
}
