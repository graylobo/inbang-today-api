import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum ActivityType {
  POST_CREATE = 'POST_CREATE',
  COMMENT_CREATE = 'COMMENT_CREATE',
  POST_LIKE = 'POST_LIKE',
  COMMENT_LIKE = 'COMMENT_LIKE',
  DAILY_LOGIN = 'DAILY_LOGIN',
  PROFILE_COMPLETE = 'PROFILE_COMPLETE',
  POST_SHARE = 'POST_SHARE',
  COMMENT_REPLY = 'COMMENT_REPLY',
  POST_VIEW = 'POST_VIEW',
  BROADCAST_EARNING = 'BROADCAST_EARNING',
}

@Entity()
export class UserActivity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  activityType: ActivityType;

  @Column()
  points: number;

  @Column({ nullable: true })
  referenceId: number;

  @Column({ type: 'text', nullable: true })
  description: string;
}
