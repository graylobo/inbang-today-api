import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { CrewMember } from './crew-member.entity';

@Entity()
export class CrewEarning {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CrewMember)
  member: CrewMember;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  earningDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: 0 })
  reportCount: number; // 허위 신고 횟수를 기록

  @Column({ default: false })
  isVerified: boolean; // 검증된 데이터인지 여부
}
