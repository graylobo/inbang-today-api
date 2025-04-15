import {
  Controller,
  Get,
  UseGuards,
  Param,
  Patch,
  Body,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { UserService } from 'src/modules/user/user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    try {
      const currentUser = await this.userService.findById(user.userId);
      return {
        success: true,
        data: currentUser,
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
  async getAllUsers(@CurrentUser() user: any) {
    try {
      const currentUser = await this.userService.findById(user.userId);
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
    @CurrentUser() user: any,
    @Param('userId') targetUserId: number,
    @Body() data: { isAdmin: boolean },
  ) {
    try {
      const currentUser = await this.userService.findById(user.userId);

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
    @CurrentUser() user: any,
    @Param('userId') targetUserId: number,
    @Body() data: { isSuperAdmin: boolean },
  ) {
    try {
      const currentUser = await this.userService.findById(user.userId);

      // 슈퍼 관리자만 다른 슈퍼 관리자 권한을 토글할 수 있음
      if (!currentUser.isSuperAdmin) {
        throw new ForbiddenException(
          '슈퍼 관리자만 슈퍼 관리자 권한을 변경할 수 있습니다.',
        );
      }

      // 자기 자신의 슈퍼 관리자 권한은 제거할 수 없음 (최소 1명의 슈퍼 관리자가 필요)
      if (Number(targetUserId) === user.userId && !data.isSuperAdmin) {
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

  @UseGuards(JwtAuthGuard)
  @Patch('profile/image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadProfileImage(
    @CurrentUser() user: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    try {
      return await this.userService.updateProfileImage(user.userId, file);
    } catch (error) {
      console.error('Upload profile image error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
