import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CrewMember } from './crew-member.entity';
import { CrewRank } from './crew-rank.entity';
import { CrewBroadcast } from './crew-broadcast.entity';

@Entity()
export class Crew {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  iconUrl: string;

  @OneToMany(() => CrewMember, (member) => member.crew)
  members: CrewMember[];

  @OneToMany(() => CrewRank, (rank) => rank.crew)
  ranks: CrewRank[];

  @OneToMany(() => CrewBroadcast, broadcast => broadcast.crew)
  broadcasts: CrewBroadcast[];
}
