import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Crew } from './crew.entity';
import { Streamer } from './streamer.entity';
import { BaseEntity } from 'src/entities/base.entity';
import { CrewRank } from './crew-rank.entity';
import { User } from './user.entity';

export enum CrewMemberEventType {
  JOIN = 'join',
  LEAVE = 'leave',
  RANK_CHANGE = 'rank_change',
}

@Entity()
export class CrewMemberHistory extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Streamer, { onDelete: 'CASCADE' })
  streamer: Streamer;

  @ManyToOne(() => Crew, { onDelete: 'CASCADE' })
  crew: Crew;

  @Column({
    type: 'enum',
    enum: CrewMemberEventType,
    default: CrewMemberEventType.JOIN,
  })
  eventType: CrewMemberEventType;

  @Column({ type: 'date' })
  eventDate: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ nullable: true })
  oldRankId: number;

  @Column({ nullable: true })
  newRankId: number;

  @ManyToOne(() => CrewRank, { nullable: true })
  oldRank: CrewRank;

  @ManyToOne(() => CrewRank, { nullable: true })
  newRank: CrewRank;

  @ManyToOne(() => User, { nullable: true })
  performedBy: User;
}
