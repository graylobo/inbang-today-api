import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Rank, RankCategory } from 'src/common/constants/rank.constants';

@Entity()
export class UserLevel extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({
    type: 'enum',
    enum: Rank,
    default: Rank.PRIVATE_SECOND_CLASS,
  })
  rank: Rank;

  @Column({
    type: 'enum',
    enum: RankCategory,
    default: RankCategory.SOLDIER,
  })
  rankCategory: RankCategory;

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
  rankHistory: {
    rank: Rank;
    date: Date;
    reason: string;
  }[];
}
