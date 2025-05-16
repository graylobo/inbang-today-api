import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Crew } from './crew.entity';
import { Streamer } from './streamer.entity';
import { BaseEntity } from 'src/entities/base.entity';

export enum CrewMemberEventType {
  JOIN = 'join',
  LEAVE = 'leave',
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
}
