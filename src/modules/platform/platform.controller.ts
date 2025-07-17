import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { AdminGuard } from '../../guards/admin.guard';
import { PlatformService } from 'src/modules/platform/platform.service';

@Controller('platforms')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get()
  async getAllPlatforms() {
    return await this.platformService.getAllPlatforms();
  }

  @Get(':id')
  async getPlatformById(@Param('id') id: number) {
    return await this.platformService.getPlatformById(id);
  }

  @Post()
  //   @UseGuards(JwtAuthGuard, AdminGuard)
  async createPlatform(@Body() createPlatformDto: any) {
    return await this.platformService.createPlatform(createPlatformDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updatePlatform(
    @Param('id') id: number,
    @Body() updatePlatformDto: any,
  ) {
    return await this.platformService.updatePlatform(id, updatePlatformDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deletePlatform(@Param('id') id: number) {
    return await this.platformService.deletePlatform(id);
  }
}
