import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum BadgeType {
  ACHIEVEMENT = 'ACHIEVEMENT', // 업적 배지
  MILESTONE = 'MILESTONE', // 이정표 배지
  SPECIAL = 'SPECIAL', // 특별 배지
}

export enum BadgeCategory {
  POST = 'POST',
  COMMENT = 'COMMENT',
  SOCIAL = 'SOCIAL',
  LEVEL = 'LEVEL',
  SPECIAL = 'SPECIAL',
}

@Entity()
export class Badge extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: BadgeType,
  })
  type: BadgeType;

  @Column({
    type: 'enum',
    enum: BadgeCategory,
  })
  category: BadgeCategory;

  @Column({ type: 'json', nullable: true })
  requirements: {
    activityType?: string;
    count?: number;
    level?: number;
    points?: number;
  };

  @Column({ default: false })
  isHidden: boolean; // 숨겨진 배지 여부
}
