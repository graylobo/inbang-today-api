import { Controller, Get, UseGuards } from '@nestjs/common';
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
      if (!currentUser.isAdmin) {
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
}
