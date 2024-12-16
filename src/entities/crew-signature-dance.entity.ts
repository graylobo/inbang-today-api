import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { CrewSignature } from './crew-signature.entity';
import { CrewMember } from './crew-member.entity';

@Entity()
export class CrewSignatureDance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CrewSignature, (signature) => signature.dances, {
    onDelete: 'CASCADE',
  })
  signature: CrewSignature;

  @ManyToOne(() => CrewMember)
  member: CrewMember;

  @Column({ type: 'text' })
  danceVideoUrl: string;

  @Column({ type: 'date' })
  performedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
