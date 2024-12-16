import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Crew } from './crew.entity';
import { CrewSignatureDance } from 'src/entities/crew-signature-dance.entity';

@Entity()
export class CrewSignature {
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
