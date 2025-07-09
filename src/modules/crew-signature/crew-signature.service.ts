import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    // 업데이트 수행자 정보 조회
    let updatedBy = null;
    if (userId) {
      updatedBy = await this.userRepository.findOne({
        where: { id: userId },
      });
    }

    const updateData = {
      ...signatureData,
      crew: signatureData.crewId ? { id: signatureData.crewId } : undefined,
      updatedBy,
    };

    await this.signatureRepository.update(id, updateData);

    return this.signatureRepository.findOne({
      where: { id },
      relations: [
        'dances',
        'createdBy',
        'updatedBy',
        'dances.createdBy',
        'dances.updatedBy',
      ],
    });
  }

  async delete(id: number): Promise<void> {
    await this.signatureRepository.softDelete(id);
  }
}
