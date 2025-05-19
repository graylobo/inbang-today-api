import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  Unique,
} from 'typeorm';
import { Streamer } from './streamer.entity';
import { BaseEntity } from './base.entity';

@Entity()
@Unique(['streamer', 'month'])
export class StreamerEloRecord extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Streamer, (streamer) => streamer.eloRecords)
  streamer: Streamer;

  @Column('varchar', { length: 7 }) // YYYY-MM 형식
  @Index()
  month: string;

  @Column('float')
  eloPoint: number;

  @Column('date')
  recordDate: Date;
}
