import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CrewSignature } from './crew-signature.entity';

@Entity()
export class CrewSignatureDance extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CrewSignature, (signature) => signature.dances, {
    onDelete: 'CASCADE',
  })
  signature: CrewSignature;

  @Column({ nullable: true })
  memberName: string;

  @Column({ type: 'text' })
  danceVideoUrl: string;

  @Column({ type: 'date' })
  performedAt: Date;
}
