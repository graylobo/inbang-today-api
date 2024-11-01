import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { CrewMember } from './crew-member.entity';
import { Crew } from './crew.entity';

@Entity()
export class CrewRank {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  level: number; // 계급 순서 (낮을수록 높은 계급)

  @ManyToOne(() => Crew, (crew) => crew.ranks)
  crew: Crew;

  @OneToMany(() => CrewMember, (member) => member.rank)
  members: CrewMember[];
}
