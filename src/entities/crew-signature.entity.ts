import { CrewSignatureDance } from 'src/entities/crew-signature-dance.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Crew } from './crew.entity';

@Entity()
export class CrewSignature extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Crew, (crew) => crew.signatures)
  crew: Crew;

  @Column()
  starballoonCount: number;

  @Column()
  songName: string;

  @Column({ type: 'text' })
  signatureImageUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => CrewSignatureDance, (dance) => dance.signature, {
    cascade: true,
  })
  dances: CrewSignatureDance[];
}
