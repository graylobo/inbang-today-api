import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Crew } from './crew.entity';
import { StreamerPlatform } from './streamer-platform.entity';

@Entity()
export class CrewRank {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  level: number; // 계급 순서 (낮을수록 높은 계급)

  @ManyToOne(() => Crew, (crew) => crew.ranks, {
    onDelete: 'CASCADE',
  })
  crew: Crew;

  @OneToMany(() => StreamerPlatform, (member) => member.crewRank)
  platformMembers: StreamerPlatform[];
}
