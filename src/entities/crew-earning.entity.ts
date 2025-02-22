import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Streamer } from './streamer.entity';
import { User } from './user.entity';

@Entity()
export class CrewEarning {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Streamer, { eager: true, onDelete: 'CASCADE' })
  member: Streamer;

  @ManyToOne(() => User, { eager: true })
  submittedBy: User;

  @Column('integer')
  amount: number;

  @Column({ type: 'date' })
  earningDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: 0 })
  reportCount: number;

  @Column({ default: false })
  isVerified: boolean;
}
