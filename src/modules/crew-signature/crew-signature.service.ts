import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrewSignature } from 'src/entities/crew-signature.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CrewSignatureService {
  constructor(
    @InjectRepository(CrewSignature)
    private signatureRepository: Repository<CrewSignature>,
  ) {}

  async findAllByCrewId(crewId: number): Promise<CrewSignature[]> {
    return this.signatureRepository.find({
      where: { crew: { id: crewId } },
      order: { starballoonCount: 'ASC' },
    });
  }

  async create(signatureData: any) {
    const signature = this.signatureRepository.create({
      ...signatureData,
      crew: { id: signatureData.crewId },
    });
    return this.signatureRepository.save(signature);
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
