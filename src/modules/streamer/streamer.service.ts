import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Streamer } from '../../entities/streamer.entity';
import { StreamerCategoryService } from '../category/streamer-category.service';
import { In } from 'typeorm';
import { CrewRank } from '../../entities/crew-rank.entity';
import { Crew } from '../../entities/crew.entity';
import { Platform } from '../../entities/platform.entity';
import { StreamerPlatform } from '../../entities/streamer-platform.entity';
import { ILike } from 'typeorm';

@Injectable()
export class StreamerService {
  constructor(
    @InjectRepository(Streamer)
    private streamerRepository: Repository<Streamer>,
    @InjectRepository(CrewRank)
    private crewRankRepository: Repository<CrewRank>,
    @InjectRepository(Crew)
    private crewRepository: Repository<Crew>,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>,
    @InjectRepository(StreamerPlatform)
    private streamerPlatformRepository: Repository<StreamerPlatform>,
    private streamerCategoryService: StreamerCategoryService,
  ) {}

  async findAll(): Promise<Streamer[]> {
    return this.streamerRepository.find({
      relations: [
        'platforms',
        'platforms.platform',
        'platforms.crew',
        'platforms.crewRank',
        'streamerCategories',
        'streamerCategories.category',
      ],
      order: {
        name: 'ASC',
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
        'platforms',
        'platforms.platform',
        'platforms.crew',
        'platforms.crewRank',
        'streamerCategories',
        'streamerCategories.category',
      ],
      order: {
        name: 'ASC',
      },
    });
  }

  async findAllByCrewId(crewId: number): Promise<Streamer[]> {
    return this.streamerRepository.find({
      where: {
        platforms: {
          crew: { id: crewId },
        },
      },
      relations: [
        'platforms',
        'platforms.platform',
        'platforms.crew',
        'platforms.crewRank',
        'streamerCategories',
        'streamerCategories.category',
      ],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Streamer> {
    return this.streamerRepository.findOne({
      where: { id },
      relations: [
        'platforms',
        'platforms.platform',
        'platforms.crew',
        'platforms.crewRank',
        'streamerCategories',
        'streamerCategories.category',
      ],
    });
  }

  // 스트리머 검색 (이름 또는 플랫폼 ID로 검색)
  async searchStreamers(query: string): Promise<Streamer[]> {
    return this.streamerRepository.find({
      where: [
        { name: ILike(`%${query}%`) },
        { nickname: ILike(`%${query}%`) },
        { platforms: { platformStreamerId: ILike(`%${query}%`) } },
      ],
      relations: [
        'platforms',
        'platforms.platform',
        'platforms.crew',
        'platforms.crewRank',
        'streamerCategories',
        'streamerCategories.category',
      ],
      order: {
        name: 'ASC',
      },
    });
  }

  async create(memberData: any): Promise<Streamer> {
    // 이름으로 기존 스트리머 검색
    let streamer: Streamer = null;
    if (memberData.name) {
      streamer = await this.streamerRepository.findOne({
        where: { name: memberData.name },
        relations: [
          'platforms',
          'platforms.platform',
          'platforms.crew',
          'platforms.crewRank',
        ],
      });
    }

    if (streamer) {
      // 이미 동일한 크루에 속해있는지 확인 (soop 플랫폼 기준)
      const soopPlatform = streamer.platforms?.find(
        (p) => p.platform?.name === 'soop',
      );
      if (
        soopPlatform?.crew &&
        memberData.crewId &&
        soopPlatform.crew.id === memberData.crewId
      ) {
        throw new ConflictException(
          `스트리머 "${streamer.name}"은(는) 이미 해당 크루에 소속되어 있습니다.`,
        );
      }

      // 이미 등록된 스트리머면 플랫폼 정보 업데이트
      if (memberData.crewId || memberData.rankId || memberData.soopId) {
        await this.updateStreamerPlatform(streamer.id, memberData);
      }
    } else {
      // 새로운 스트리머 생성
      streamer = this.streamerRepository.create({
        name: memberData.name,
        nickname: memberData.nickname,
      });

      streamer = await this.streamerRepository.save(streamer);

      // 플랫폼 정보 생성
      if (memberData.crewId || memberData.rankId || memberData.soopId) {
        await this.updateStreamerPlatform(streamer.id, memberData);
      }
    }

    // 카테고리가 제공된 경우, 카테고리 설정
    if (memberData.categoryIds?.length > 0) {
      await this.streamerCategoryService.setStreamerCategories(
        streamer.id,
        memberData.categoryIds,
      );

      // 모든 관계를 포함하여 다시 조회
      return this.findOne(streamer.id);
    }

    return streamer;
  }

  private async updateStreamerPlatform(
    streamerId: number,
    memberData: any,
  ): Promise<void> {
    // soop 플랫폼 찾기
    const soopPlatform = await this.platformRepository.findOne({
      where: { name: 'soop' },
    });

    if (!soopPlatform) {
      throw new InternalServerErrorException('Soop 플랫폼을 찾을 수 없습니다.');
    }

    // 기존 플랫폼 정보 찾기
    let streamerPlatform = await this.streamerPlatformRepository.findOne({
      where: {
        streamer: { id: streamerId },
        platform: { id: soopPlatform.id },
      },
      relations: ['crew', 'crewRank'],
    });

    if (streamerPlatform) {
      // 기존 정보 업데이트
      if (memberData.crewId) {
        const crew = await this.crewRepository.findOne({
          where: { id: memberData.crewId },
        });
        if (crew) streamerPlatform.crew = crew;
      }
      if (memberData.rankId) {
        const crewRank = await this.crewRankRepository.findOne({
          where: { id: memberData.rankId },
        });
        if (crewRank) streamerPlatform.crewRank = crewRank;
      }
      if (memberData.soopId)
        streamerPlatform.platformStreamerId = memberData.soopId;
    } else {
      // 새로운 플랫폼 정보 생성
      const streamer = await this.streamerRepository.findOne({
        where: { id: streamerId },
      });
      if (!streamer) {
        throw new NotFoundException('Streamer not found');
      }

      streamerPlatform = this.streamerPlatformRepository.create({
        streamer,
        platform: soopPlatform,
        platformStreamerId: memberData.soopId,
        platformUsername: memberData.name,
      });

      // crew와 crewRank 설정
      if (memberData.crewId) {
        const crew = await this.crewRepository.findOne({
          where: { id: memberData.crewId },
        });
        if (crew) streamerPlatform.crew = crew;
      }
      if (memberData.rankId) {
        const crewRank = await this.crewRankRepository.findOne({
          where: { id: memberData.rankId },
        });
        if (crewRank) streamerPlatform.crewRank = crewRank;
      }
    }

    await this.streamerPlatformRepository.save(streamerPlatform);
  }

  async update(id: number, memberData: any): Promise<Streamer> {
    const member = await this.findOne(id);
    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    // 기본 정보 업데이트
    if (memberData.name) member.name = memberData.name;
    if (memberData.nickname !== undefined)
      member.nickname = memberData.nickname;

    const updatedMember = await this.streamerRepository.save(member);

    // 플랫폼 정보 업데이트
    if (memberData.crewId || memberData.rankId || memberData.soopId) {
      await this.updateStreamerPlatform(id, memberData);
    }

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
      const streamer = await this.streamerRepository.findOne({
        where: { id },
        relations: ['earnings', 'streamerCategories'],
      });

      if (!streamer) {
        throw new NotFoundException('Member not found');
      }

      await this.streamerRepository.softDelete(id);
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
        'platforms',
        'platforms.crew',
        'platforms.crewRank',
        'streamerCategories',
        'streamerCategories.category',
      ],
      order: {
        name: 'ASC',
      },
    });
  }

  async createBulk(
    membersData: (Partial<Streamer> & {
      categoryIds?: number[];
      rankName?: string;
      crewId?: number;
      rankId?: number;
    })[],
  ): Promise<Streamer[]> {
    const results = [];

    // 모든 크루 랭크를 미리 불러와서 캐싱 (N+1 쿼리 방지)
    const allRanks = await this.crewRankRepository.find({
      relations: ['crew'],
    });

    for (const memberData of membersData) {
      try {
        // rankName이 있으면 그에 해당하는 rankId 찾기
        if (memberData.rankName && memberData.crewId) {
          const rank = allRanks.find(
            (r) =>
              r.name === memberData.rankName && r.crew.id === memberData.crewId,
          );

          if (rank) {
            memberData.rankId = rank.id;
          } else {
            console.warn(
              `Rank with name "${memberData.rankName}" and crewId ${memberData.crewId} not found. Using provided rankId if available.`,
            );
          }
        }

        // rankName 속성 제거 (실제 엔티티 필드가 아님)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { rankName, ...cleanedData } = memberData;

        const streamer = await this.create(cleanedData);
        results.push(streamer);
      } catch (error) {
        console.error(
          `Failed to create streamer ${memberData.name}: ${error.message}`,
        );
        // 에러가 발생해도 계속 진행 (필요에 따라 조정 가능)
      }
    }

    return results;
  }

  // Add new method to remove a member from their crew
  async removeFromCrew(id: number): Promise<Streamer> {
    // Find the member
    const member = await this.findOne(id);
    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    // Find soop platform info
    const soopPlatform = member.platforms?.find(
      (p) => p.platform?.name === 'soop',
    );
    if (!soopPlatform || !soopPlatform.crew) {
      return member; // Not in a crew
    }

    // Remove the member from the crew
    soopPlatform.crew = null;
    soopPlatform.crewRank = null;
    await this.streamerPlatformRepository.save(soopPlatform);

    return this.findOne(id);
  }

  // 스트리머를 특정 크루에 입사시키는 메서드
  async joinCrew(
    streamerId: number,
    crewId: number,
    rankId?: number,
  ): Promise<Streamer> {
    const streamer = await this.findOne(streamerId);
    if (!streamer) {
      throw new NotFoundException(`Streamer with ID ${streamerId} not found`);
    }

    // 플랫폼 정보 업데이트
    await this.updateStreamerPlatform(streamerId, { crewId, rankId });

    return this.findOne(streamerId);
  }

  // 스트리머를 크루에서 퇴사시키는 메서드 (removeFromCrew와 비슷하지만 분리)
  async leaveCrew(streamerId: number): Promise<Streamer> {
    const streamer = await this.findOne(streamerId);
    if (!streamer) {
      throw new NotFoundException(
        `스트리머 ID ${streamerId}가 존재하지 않습니다.`,
      );
    }

    // Find soop platform info
    const soopPlatform = streamer.platforms?.find(
      (p) => p.platform?.name === 'soop',
    );
    if (!soopPlatform || !soopPlatform.crew) {
      throw new ConflictException(
        `해당 스트리머는 이미 크루에 속해있지 않습니다.`,
      );
    }

    // 크루 및 직급 정보 제거
    soopPlatform.crew = null;
    soopPlatform.crewRank = null;
    await this.streamerPlatformRepository.save(soopPlatform);

    return this.findOne(streamerId);
  }

  /**
   * 스트리머의 직급을 변경합니다.
   * @param streamerId 스트리머 ID
   * @param newRankId 새로운 직급 ID
   * @returns 업데이트된 스트리머 정보
   */
  async updateRank(streamerId: number, newRankId: number): Promise<Streamer> {
    const streamer = await this.findOne(streamerId);
    if (!streamer) {
      throw new NotFoundException(
        `스트리머 ID ${streamerId}가 존재하지 않습니다.`,
      );
    }

    // Find soop platform info
    const soopPlatform = streamer.platforms?.find(
      (p) => p.platform?.name === 'soop',
    );
    if (!soopPlatform || !soopPlatform.crew) {
      throw new ConflictException(
        `크루에 속해있지 않은 스트리머의 직급을 변경할 수 없습니다.`,
      );
    }

    // 새 직급 ID가 없는 경우
    if (!newRankId) {
      throw new ConflictException(`새 직급 ID가 유효하지 않습니다.`);
    }

    // 새 직급 정보 조회
    const newRank = await this.crewRankRepository.findOne({
      where: { id: newRankId },
      relations: ['crew'],
    });

    if (!newRank) {
      throw new NotFoundException(`직급 ID ${newRankId}가 존재하지 않습니다.`);
    }

    // 해당 직급이 스트리머의 현재 크루에 속하는지 확인
    if (newRank.crew.id !== soopPlatform.crew.id) {
      throw new ConflictException(
        `선택한 직급은 스트리머의 현재 크루에 속하지 않습니다.`,
      );
    }

    // 직급 변경
    soopPlatform.crewRank = newRank;
    await this.streamerPlatformRepository.save(soopPlatform);

    return this.findOne(streamerId);
  }
}
