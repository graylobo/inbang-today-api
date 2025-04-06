import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Crew } from './crew.entity';

@Entity()
export class UserCrewPermission extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Crew, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crewId' })
  crew: Crew;
}
