import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { CrewSignature } from './crew-signature.entity';
import { Streamer } from './streamer.entity';

@Entity()
export class CrewSignatureDance {
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

  @CreateDateColumn()
  createdAt: Date;
}
