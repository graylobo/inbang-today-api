import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { StreamerPlatform } from './streamer-platform.entity';
import { User } from './user.entity';

@Entity()
export class CrewEarning extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StreamerPlatform, { eager: true, onDelete: 'CASCADE' })
  member: StreamerPlatform;

  @ManyToOne(() => User, { eager: true })
  submittedBy: User;

  @Column('integer')
  amount: number;

  @Column({ type: 'date' })
  earningDate: Date;

  @Column({ default: 0 })
  reportCount: number;

  @Column({ default: false })
  isVerified: boolean;
}
