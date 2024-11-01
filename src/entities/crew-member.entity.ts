import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Crew } from './crew.entity';
import { CrewRank } from './crew-rank.entity';
import { CrewEarning } from './crew-earning.entity';

@Entity()
export class CrewMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  profileImageUrl: string;

  @Column({ nullable: true })
  broadcastUrl: string;

  @ManyToOne(() => Crew, (crew) => crew.members)
  crew: Crew;

  @ManyToOne(() => CrewRank, (rank) => rank.members, { eager: true })
  rank: CrewRank;

  @OneToMany(() => CrewEarning, (earning) => earning.member)
  earnings: CrewEarning[];
}
