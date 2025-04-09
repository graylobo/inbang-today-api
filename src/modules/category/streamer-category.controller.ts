import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { StreamerCategoryService } from './streamer-category.service';
import { StreamerCategory } from '../../entities/streamer-category.entity';
import { AdminGuard } from '../../guards/admin.guard';

@Controller('streamer-categories')
export class StreamerCategoryController {
  constructor(
    private readonly streamerCategoryService: StreamerCategoryService,
  ) {}

  // 스트리머의 모든 카테고리 조회
  @Get('streamer/:streamerId')
  async getStreamerCategories(
    @Param('streamerId') streamerId: string,
  ): Promise<StreamerCategory[]> {
    return this.streamerCategoryService.findStreamersCategories(+streamerId);
  }

  // 카테고리에 속한 모든 스트리머 조회
  @Get('category/:categoryId')
  async getCategoryStreamers(
    @Param('categoryId') categoryId: string,
  ): Promise<StreamerCategory[]> {
    return this.streamerCategoryService.findCategoryStreamers(+categoryId);
  }

  // 스트리머에 카테고리 추가
  // @UseGuards(AdminGuard)
  @Post('streamer/:streamerId/category/:categoryId')
  async addCategoryToStreamer(
    @Param('streamerId') streamerId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<StreamerCategory> {
    return this.streamerCategoryService.addCategoryToStreamer(
      +streamerId,
      +categoryId,
    );
  }

  // 스트리머에서 카테고리 제거
  @UseGuards(AdminGuard)
  @Delete('streamer/:streamerId/category/:categoryId')
  async removeCategoryFromStreamer(
    @Param('streamerId') streamerId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<void> {
    return this.streamerCategoryService.removeCategoryFromStreamer(
      +streamerId,
      +categoryId,
    );
  }

  // 스트리머의 모든 카테고리 설정
  @UseGuards(AdminGuard)
  @Post('streamer/:streamerId/categories')
  async setStreamerCategories(
    @Param('streamerId') streamerId: string,
    @Body() data: { categoryIds: number[] },
  ): Promise<StreamerCategory[]> {
    return this.streamerCategoryService.setStreamerCategories(
      +streamerId,
      data.categoryIds,
    );
  }
}
