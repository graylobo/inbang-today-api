import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StreamerCategory } from '../../entities/streamer-category.entity';
import { Streamer } from '../../entities/streamer.entity';
import { Category } from '../../entities/category.entity';

@Injectable()
export class StreamerCategoryService {
  constructor(
    @InjectRepository(StreamerCategory)
    private streamerCategoryRepository: Repository<StreamerCategory>,
    @InjectRepository(Streamer)
    private streamerRepository: Repository<Streamer>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  // 스트리머의 모든 카테고리 조회
  async findStreamersCategories(
    streamerId: number,
  ): Promise<StreamerCategory[]> {
    return this.streamerCategoryRepository.find({
      where: { streamer: { id: streamerId } },
      relations: ['category'],
    });
  }

  // 카테고리에 속한 모든 스트리머 조회
  async findCategoryStreamers(categoryId: number): Promise<StreamerCategory[]> {
    return this.streamerCategoryRepository.find({
      where: { category: { id: categoryId } },
      relations: ['streamer'],
    });
  }

  // 스트리머에 카테고리 추가
  async addCategoryToStreamer(
    streamerId: number,
    categoryId: number,
  ): Promise<StreamerCategory> {
    // 스트리머와 카테고리가 존재하는지 확인
    const streamer = await this.streamerRepository.findOne({
      where: { id: streamerId },
    });
    if (!streamer) {
      throw new NotFoundException(`Streamer with ID ${streamerId} not found`);
    }

    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // 이미 연결되어 있는지 확인
    const existingRelation = await this.streamerCategoryRepository.findOne({
      where: { streamer: { id: streamerId }, category: { id: categoryId } },
    });

    if (existingRelation) {
      return existingRelation; // 이미 존재하면 그대로 반환
    }

    // 새로운 관계 생성
    const newRelation = this.streamerCategoryRepository.create({
      streamer,
      category,
    });

    return await this.streamerCategoryRepository.save(newRelation);
  }

  // 스트리머에서 카테고리 제거
  async removeCategoryFromStreamer(
    streamerId: number,
    categoryId: number,
  ): Promise<void> {
    const relation = await this.streamerCategoryRepository.findOne({
      where: { streamer: { id: streamerId }, category: { id: categoryId } },
    });

    if (!relation) {
      throw new NotFoundException(
        `Relation between Streamer ${streamerId} and Category ${categoryId} not found`,
      );
    }

    await this.streamerCategoryRepository.remove(relation);
  }

  // 스트리머의 모든 카테고리 설정 (기존 카테고리 제거 후 새로 설정)
  async setStreamerCategories(
    streamerId: number,
    categoryIds: number[],
  ): Promise<StreamerCategory[]> {
    const streamer = await this.streamerRepository.findOne({
      where: { id: streamerId },
      relations: ['streamerCategories'],
    });

    if (!streamer) {
      throw new NotFoundException(`Streamer with ID ${streamerId} not found`);
    }

    // 기존 카테고리 관계 삭제
    if (streamer.streamerCategories && streamer.streamerCategories.length > 0) {
      await this.streamerCategoryRepository.remove(streamer.streamerCategories);
    }

    // 새 카테고리 관계 생성
    const newRelations: StreamerCategory[] = [];
    for (const categoryId of categoryIds) {
      const category = await this.categoryRepository.findOne({
        where: { id: categoryId },
      });
      if (category) {
        const newRelation = this.streamerCategoryRepository.create({
          streamer,
          category,
        });
        newRelations.push(
          await this.streamerCategoryRepository.save(newRelation),
        );
      }
    }

    return newRelations;
  }
}
