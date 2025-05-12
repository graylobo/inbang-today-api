import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
export class PurchasePointHistory extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  points: number;

  @Column({ nullable: true })
  referenceId: number;

  @Column({ type: 'text', nullable: true })
  description: string;
}
