import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Crew } from './crew.entity';
import { User } from 'src/entities/user.entity';

@Entity()
export class CrewBroadcast {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Crew, (crew) => crew.broadcasts)
  crew: Crew;

  @Column('integer')
  totalAmount: number;

  @Column({ type: 'date' })
  broadcastDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  submittedBy: User;

  @Column({ type: 'text', nullable: true })
  description: string;
}
