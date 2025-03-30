import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Crew } from './crew.entity';
import { User } from 'src/entities/user.entity';
import { BaseEntity } from 'src/entities/base.entity';

@Entity()
export class CrewBroadcast extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Crew, (crew) => crew.broadcasts)
  crew: Crew;

  @Column('integer')
  totalAmount: number;

  @Column({ type: 'date' })
  broadcastDate: Date;

  @ManyToOne(() => User)
  submittedBy: User;

  @Column({ type: 'text', nullable: true })
  description: string;
}
