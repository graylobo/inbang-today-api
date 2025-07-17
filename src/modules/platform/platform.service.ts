import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Platform } from '../../entities/platform.entity';

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>,
  ) {}

  async getAllPlatforms(): Promise<Platform[]> {
    return await this.platformRepository.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
  }

  async getPlatformById(id: number): Promise<Platform> {
    const platform = await this.platformRepository.findOne({
      where: { id, isActive: true },
    });
    if (!platform) {
      throw new NotFoundException('플랫폼을 찾을 수 없습니다.');
    }
    return platform;
  }

  async createPlatform(createPlatformDto: {
    name: string;
    displayName: string;
    logoUrl?: string;
  }): Promise<Platform> {
    const platform = this.platformRepository.create(createPlatformDto);
    return await this.platformRepository.save(platform);
  }

  async updatePlatform(
    id: number,
    updatePlatformDto: {
      name?: string;
      displayName?: string;
      logoUrl?: string;
      isActive?: boolean;
    },
  ): Promise<Platform> {
    const platform = await this.getPlatformById(id);
    Object.assign(platform, updatePlatformDto);
    return await this.platformRepository.save(platform);
  }

  async deletePlatform(id: number): Promise<void> {
    const platform = await this.getPlatformById(id);
    platform.isActive = false;
    await this.platformRepository.save(platform);
  }

  async initializeDefaultPlatforms(): Promise<void> {
    const defaultPlatforms = [
      { name: 'soop', displayName: '숲', logoUrl: null },
      { name: 'chzzk', displayName: '치지직', logoUrl: null },
      { name: 'youtube', displayName: '유튜브', logoUrl: null },
      { name: 'popkontv', displayName: '팝콘티비', logoUrl: null },
    ];

    for (const platformData of defaultPlatforms) {
      const existingPlatform = await this.platformRepository.findOne({
        where: { name: platformData.name },
      });

      if (!existingPlatform) {
        await this.createPlatform(platformData);
      }
    }
  }
}
