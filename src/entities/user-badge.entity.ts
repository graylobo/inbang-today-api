import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Badge } from './badge.entity';

@Entity()
export class UserBadge extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Badge)
  badge: Badge;

  @Column({ type: 'timestamp' })
  earnedAt: Date;

  @Column({ type: 'json', nullable: true })
  progress: {
    current: number;
    target: number;
  };
}
