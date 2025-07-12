import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
export class UserLevel extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.userLevel, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ default: 0 })
  level: number;

  @Column({ default: 0 })
  activityPoints: number;

  @Column({ default: 0 })
  purchasePoints: number;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastPointsReductionAt: Date;

  @Column({ type: 'json', nullable: true })
  unlockedFeatures: string[];

  @Column({ type: 'json', nullable: true })
  levelHistory: {
    level: number;
    date: Date;
    reason: string;
  }[];
}
