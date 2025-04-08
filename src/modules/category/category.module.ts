import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../../entities/category.entity';
import { StreamerCategory } from '../../entities/streamer-category.entity';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { StreamerCategoryController } from './streamer-category.controller';
import { StreamerCategoryService } from './streamer-category.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category, StreamerCategory])],
  providers: [CategoryService, StreamerCategoryService],
  controllers: [CategoryController, StreamerCategoryController],
  exports: [CategoryService, StreamerCategoryService],
})
export class CategoryModule {}
