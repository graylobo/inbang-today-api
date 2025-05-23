import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Streamer } from '../../entities/streamer.entity';
import { AdminGuard } from '../../guards/admin.guard';
import { StreamerService } from 'src/modules/streamer/streamer.service';

@Controller('streamers')
export class StreamerController {
  constructor(private readonly streamerService: StreamerService) {}

  @Get()
  async findAll(
    @Query('categoryName') categoryName?: string,
    @Query('categories') categories?: string,
  ): Promise<Streamer[]> {
    // 여러 카테고리가 콤마로 구분되어 있는 경우
    if (categories) {
      const categoryNames = categories
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      if (categoryNames.length > 0) {
        return this.streamerService.findAllByMultipleCategories(categoryNames);
      }
    }

    // 단일 카테고리 이름인 경우
    if (categoryName) {
      return this.streamerService.findAllByCategoryName(categoryName);
    }

    // 카테고리 필터가 없는 경우 전체 조회
    return this.streamerService.findAll();
  }

  @Get('crew/:crewId')
  async findAllByCrewId(@Param('crewId') crewId: string): Promise<Streamer[]> {
    return this.streamerService.findAllByCrewId(+crewId);
  }

  @Get('category/:categoryId')
  async findByCategory(
    @Param('categoryId') categoryId: string,
  ): Promise<Streamer[]> {
    return this.streamerService.findStreamersByCategory(+categoryId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Streamer> {
    const member = await this.streamerService.findOne(+id);
    if (!member) {
      throw new HttpException('Member not found', HttpStatus.NOT_FOUND);
    }
    return member;
  }

  @UseGuards(AdminGuard)
  @Post()
  async create(
    @Body() memberData: Partial<Streamer> & { categoryIds?: number[] },
  ): Promise<Streamer> {
    return await this.streamerService.create(memberData);
  }

  @UseGuards(AdminGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() memberData: Partial<Streamer> & { categoryIds?: number[] },
  ): Promise<Streamer> {
    try {
      const member = await this.streamerService.findOne(+id);
      if (!member) {
        throw new HttpException('Member not found', HttpStatus.NOT_FOUND);
      }
      return await this.streamerService.update(+id, memberData);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to update member',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.streamerService.delete(+id);
  }
}
