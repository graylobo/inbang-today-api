import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Streamer } from '../../entities/streamer.entity';
import { ErrorCode } from 'src/common/enums/error-codes.enum';
import { StreamerCategoryService } from '../category/streamer-category.service';
import { In } from 'typeorm';

@Injectable()
export class StreamerService {
  constructor(
    @InjectRepository(Streamer)
    private streamerRepository: Repository<Streamer>,
    private streamerCategoryService: StreamerCategoryService,
  ) {}

  async findAll(): Promise<Streamer[]> {
    return this.streamerRepository.find({
      relations: [
        'crew',
        'rank',
        'streamerCategories',
        'streamerCategories.category',
      ],
      order: {
        crew: { name: 'ASC' },
        rank: { level: 'ASC' },
      },
    });
  }

  async findAllByCategoryName(categoryName: string): Promise<Streamer[]> {
    // 지정된 이름의 카테고리에 속한 스트리머를 조회
    const categoriesWithStreamerIds =
      await this.streamerCategoryService.findStreamersByCategoryName(
        categoryName,
      );

    if (!categoriesWithStreamerIds.length) {
      return [];
    }

    // 스트리머 ID 목록 추출
    const streamerIds = [
      ...new Set(categoriesWithStreamerIds.map((sc) => sc.streamer.id)),
    ];

    // 해당 ID에 해당하는 모든 스트리머 정보 조회 (관계 포함)
    return this.streamerRepository.find({
      where: { id: In(streamerIds) },
      relations: [
        'crew',
        'rank',
        'streamerCategories',
        'streamerCategories.category',
      ],
      order: {
        crew: { name: 'ASC' },
        rank: { level: 'ASC' },
      },
    });
  }

  async findAllByMultipleCategories(
    categoryNames: string[],
  ): Promise<Streamer[]> {
    // 여러 카테고리 이름에 속한 스트리머 조회
    const categoriesWithStreamerIds =
      await this.streamerCategoryService.findStreamersByMultipleCategories(
        categoryNames,
      );

    if (!categoriesWithStreamerIds.length) {
      return [];
    }

    // 스트리머 ID 목록 추출 (중복 제거)
    const streamerIds = [
      ...new Set(categoriesWithStreamerIds.map((sc) => sc.streamer.id)),
    ];

    // 해당 ID에 해당하는 모든 스트리머 정보 조회 (관계 포함)
    return this.streamerRepository.find({
      where: { id: In(streamerIds) },
      relations: [
        'crew',
        'rank',
        'streamerCategories',
        'streamerCategories.category',
      ],
      order: {
        crew: { name: 'ASC' },
        rank: { level: 'ASC' },
      },
    });
  }

  async findAllByCrewId(crewId: number): Promise<Streamer[]> {
    return this.streamerRepository.find({
      where: { crew: { id: crewId } },
      relations: [
        'rank',
        'crew',
        'streamerCategories',
        'streamerCategories.category',
      ],
      order: { rank: { level: 'ASC' } },
    });
  }

  async findOne(id: number): Promise<Streamer> {
    return this.streamerRepository.findOne({
      where: { id },
      relations: [
        'rank',
        'crew',
        'streamerCategories',
        'streamerCategories.category',
      ],
    });
  }

  async create(memberData: any): Promise<Streamer> {
    const existingStreamer = await this.streamerRepository.findOne({
      where: { name: memberData.name },
    });

    if (existingStreamer) {
      throw new BadRequestException(ErrorCode.DUPLICATE_NAME);
    }

    const member = this.streamerRepository.create({
      name: memberData.name,
      soopId: memberData.soopId,
      crew: { id: memberData.crewId },
      rank: { id: memberData.rankId },
    });

    const savedMember = await this.streamerRepository.save(member);

    // 카테고리가 제공된 경우, 카테고리 설정
    if (memberData.categoryIds && memberData.categoryIds.length > 0) {
      await this.streamerCategoryService.setStreamerCategories(
        savedMember.id,
        memberData.categoryIds,
      );

      // 카테고리 관계를 포함하여 다시 조회
      return this.findOne(savedMember.id);
    }

    return savedMember;
  }

  async update(id: number, memberData: any): Promise<Streamer> {
    const member = await this.findOne(id);
    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    // 기본 정보 업데이트
    if (memberData.name) member.name = memberData.name;
    if (memberData.soopId !== undefined) member.soopId = memberData.soopId;
    if (memberData.crewId) member.crew = { id: memberData.crewId } as any;
    if (memberData.rankId) member.rank = { id: memberData.rankId } as any;
    if (memberData.nickname !== undefined)
      member.nickname = memberData.nickname;
    if (memberData.race !== undefined) member.race = memberData.race;
    if (memberData.tier !== undefined) member.tier = memberData.tier;

    const updatedMember = await this.streamerRepository.save(member);

    // 카테고리 업데이트 (제공된 경우)
    if (memberData.categoryIds) {
      await this.streamerCategoryService.setStreamerCategories(
        id,
        memberData.categoryIds,
      );

      // 업데이트된 카테고리 관계를 포함하여 다시 조회
      return this.findOne(id);
    }

    return updatedMember;
  }

  async delete(id: number): Promise<void> {
    try {
      const member = await this.streamerRepository.findOne({
        where: { id },
        relations: ['earnings', 'streamerCategories'],
      });

      if (!member) {
        throw new NotFoundException('Member not found');
      }

      await this.streamerRepository.remove(member);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete member');
    }
  }

  // 특정 카테고리에 속한 모든 스트리머 조회
  async findStreamersByCategory(categoryId: number): Promise<Streamer[]> {
    const streamerCategories =
      await this.streamerCategoryService.findCategoryStreamers(categoryId);
    if (!streamerCategories.length) return [];

    // 스트리머 ID 추출
    const streamerIds = streamerCategories.map((sc) => sc.streamer.id);

    // 모든 스트리머 정보 조회
    return this.streamerRepository.find({
      where: { id: In(streamerIds) },
      relations: [
        'rank',
        'crew',
        'streamerCategories',
        'streamerCategories.category',
      ],
      order: {
        crew: { name: 'ASC' },
        rank: { level: 'ASC' },
      },
    });
  }
}
