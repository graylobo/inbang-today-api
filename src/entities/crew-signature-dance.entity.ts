import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CrewSignature } from './crew-signature.entity';
import { Streamer } from './streamer.entity';

@Entity()
export class CrewSignatureDance extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CrewSignature, (signature) => signature.dances, {
    onDelete: 'CASCADE',
  })
  signature: CrewSignature;

  @ManyToOne(() => Streamer)
  member: Streamer;

  @Column({ type: 'text' })
  danceVideoUrl: string;

  @Column({ type: 'date' })
  performedAt: Date;
}
