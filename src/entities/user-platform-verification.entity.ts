import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Platform } from './platform.entity';

@Entity()
export class UserPlatformVerification extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Platform)
  @JoinColumn()
  platform: Platform;

  @Column()
  platformId: number;

  @Column()
  platformUsername: string; // 해당 플랫폼의 사용자명

  @Column({ nullable: true })
  verificationCode: string;

  @Column({ nullable: true })
  verificationCodeGeneratedAt: Date;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verifiedAt: Date;

  @Column({ nullable: true })
  profileUrl: string; // 플랫폼별 프로필 URL

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // 플랫폼별 추가 정보 (JSON)
}
