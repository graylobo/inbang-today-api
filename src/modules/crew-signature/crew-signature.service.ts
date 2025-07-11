import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CrewSignature } from '../../entities/crew-signature.entity';
import { CrewSignatureDance } from '../../entities/crew-signature-dance.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class CrewSignatureService {
  constructor(
    @InjectRepository(CrewSignature)
    private signatureRepository: Repository<CrewSignature>,
    @InjectRepository(CrewSignatureDance)
    private dancesRepository: Repository<CrewSignatureDance>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async findAllByCrewId(crewId: number): Promise<CrewSignature[]> {
    return this.signatureRepository.find({
      where: { crew: { id: crewId } },
      relations: [
        'dances',
        'createdBy',
        'updatedBy',
        'dances.createdBy',
        'dances.updatedBy',
      ],
      order: { starballoonCount: 'ASC' },
    });
  }

  async create(signatureData: any, userId?: number) {
    const { dances, ...signatureInfo } = signatureData;

    // 생성자 정보 조회
    let createdBy = null;
    if (userId) {
      createdBy = await this.userRepository.findOne({
        where: { id: userId },
      });
    }

    const signature = this.signatureRepository.create({
      ...signatureInfo,
      crew: { id: signatureInfo.crewId },
      createdBy,
    });

    const savedSignatures = await this.signatureRepository.save(signature);
    const savedSignature = Array.isArray(savedSignatures)
      ? savedSignatures[0]
      : savedSignatures;

    if (dances && dances.length > 0) {
      const danceEntities = dances.map((dance: any) =>
        this.dancesRepository.create({
          ...dance,
          signature: savedSignature,
          createdBy,
        }),
      );
      await this.dancesRepository.save(danceEntities);
    }

    return this.signatureRepository.findOne({
      where: { id: savedSignature.id },
      relations: [
        'dances',
        'createdBy',
        'updatedBy',
        'dances.createdBy',
        'dances.updatedBy',
      ],
    });
  }

  async update(id: number, signatureData: any, userId?: number) {
    return await this.dataSource.transaction(async (manager) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { dances, signatureId, ...signatureInfo } = signatureData;

      // 업데이트 수행자 정보 조회
      let updatedBy = null;
      if (userId) {
        updatedBy = await manager.findOne(User, {
          where: { id: userId },
        });
      }

      // dances 필드와 signatureId를 제외한 시그니처 기본 정보만 업데이트
      const updateData = {
        ...signatureInfo,
        crew: signatureInfo.crewId ? { id: signatureInfo.crewId } : undefined,
        updatedBy,
      };

      await manager.update(CrewSignature, id, updateData);

      // dances 처리 - 차분 업데이트 방식
      if (dances !== undefined) {
        // 기존 시그니처 조회 (soft delete된 것 제외)
        const signature = await manager.findOne(CrewSignature, {
          where: { id },
          relations: ['dances'],
        });

        if (signature) {
          // 현재 DB의 춤 영상 ID 목록
          const existingDanceIds = signature.dances.map((dance) => dance.id);

          // 클라이언트에서 보낸 춤 영상 ID 목록 (기존 것들만)
          const clientDanceIds = dances
            .filter((dance: any) => dance.id)
            .map((dance: any) => dance.id);

          // 1. 삭제 대상: DB에는 있지만 클라이언트에는 없는 것들
          const toDeleteIds = existingDanceIds.filter(
            (existingId) => !clientDanceIds.includes(existingId),
          );

          if (toDeleteIds.length > 0) {
            await manager.softDelete(CrewSignatureDance, toDeleteIds);
          }

          // 2. 기존 춤 영상 업데이트
          for (const dance of dances) {
            if (dance.id) {
              // 기존 춤 영상 업데이트
              await manager.update(CrewSignatureDance, dance.id, {
                memberName: dance.memberName,
                danceVideoUrl: dance.danceVideoUrl,
                performedAt: dance.performedAt,
                updatedBy,
              });
            }
          }

          // 3. 새로운 춤 영상 생성 (ID가 없는 것들)
          const newDances = dances.filter((dance: any) => !dance.id);
          if (newDances.length > 0) {
            const danceEntities = newDances.map((dance: any) =>
              manager.create(CrewSignatureDance, {
                memberName: dance.memberName,
                danceVideoUrl: dance.danceVideoUrl,
                performedAt: dance.performedAt,
                signature,
                createdBy: updatedBy,
              }),
            );
            await manager.save(CrewSignatureDance, danceEntities);
          }
        }
      }

      return await manager.findOne(CrewSignature, {
        where: { id },
        relations: [
          'dances',
          'createdBy',
          'updatedBy',
          'dances.createdBy',
          'dances.updatedBy',
        ],
      });
    });
  }

  async delete(id: number): Promise<void> {
    await this.signatureRepository.softDelete(id);
  }
}
