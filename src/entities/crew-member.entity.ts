import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Crew } from './crew.entity';
import { CrewRank } from './crew-rank.entity';

@Entity()
export class CrewMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Crew, (crew) => crew.members)
  crew: Crew;

  @ManyToOne(() => CrewRank, (rank) => rank.members)
  rank: CrewRank;
}
