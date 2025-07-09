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
import { User } from './user.entity';

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

  @ManyToOne(() => User, { nullable: true })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  updatedBy: User;
}
