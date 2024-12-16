import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrewSignature } from '../../entities/crew-signature.entity';
import { CrewSignatureDance } from '../../entities/crew-signature-dance.entity';

@Injectable()
export class CrewSignatureService {
  constructor(
    @InjectRepository(CrewSignature)
    private signatureRepository: Repository<CrewSignature>,
    @InjectRepository(CrewSignatureDance)
    private dancesRepository: Repository<CrewSignatureDance>,
  ) {}

  async findAllByCrewId(crewId: number): Promise<CrewSignature[]> {
    return this.signatureRepository.find({
      where: { crew: { id: crewId } },
      relations: ['dances', 'dances.member'],
      order: { starballoonCount: 'ASC' },
    });
  }

  async create(signatureData: any) {
    const { dances, ...signatureInfo } = signatureData;

    const signature = this.signatureRepository.create({
      ...signatureInfo,
      crew: { id: signatureInfo.crewId },
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
          member: { id: dance.memberId },
        }),
      );
      await this.dancesRepository.save(danceEntities);
    }

    return this.signatureRepository.findOne({
      where: { id: savedSignature.id },
      relations: ['dances', 'dances.member'],
    });
  }

  async update(id: number, signatureData: any) {
    const updateData = {
      ...signatureData,
      crew: signatureData.crewId ? { id: signatureData.crewId } : undefined,
    };
    await this.signatureRepository.update(id, updateData);
    return this.signatureRepository.findOne({ where: { id } });
  }

  async delete(id: number): Promise<void> {
    await this.signatureRepository.delete(id);
  }
}
