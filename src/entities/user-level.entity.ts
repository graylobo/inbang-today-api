import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
export class UserLevel extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
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
