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
import { StreamerCategory } from './streamer-category.entity';
import { StarCraftRace } from 'src/entities/types/streamer.type';

@Entity()
export class Streamer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ nullable: true })
  soopId: string;

  @Column({ nullable: true })
  eloBoardId: string;

  @Column({ nullable: true })
  profileImageUrl: string;

  @Column({ nullable: true })
  broadcastUrl: string;

  @Column({
    type: 'enum',
    enum: StarCraftRace,
    nullable: true,
  })
  race: StarCraftRace;

  @Column({ nullable: true })
  tier: string;

  @ManyToOne(() => Crew, (crew) => crew.members)
  crew: Crew;

  @ManyToOne(() => CrewRank, (rank) => rank.members, { eager: true })
  rank: CrewRank;

  @OneToMany(() => CrewEarning, (earning) => earning.member)
  earnings: CrewEarning[];

  @OneToMany(
    () => StreamerCategory,
    (streamerCategory) => streamerCategory.streamer,
  )
  streamerCategories: StreamerCategory[];
}
