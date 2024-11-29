import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { CrewMember } from './crew-member.entity';
import { User } from './user.entity';

@Entity()
export class CrewEarning {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CrewMember, { eager: true, onDelete: 'CASCADE' })
  member: CrewMember;

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
