import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CrewSignature } from './crew-signature.entity';
import { User } from './user.entity';

@Entity()
export class CrewSignatureDance extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CrewSignature, (signature) => signature.dances, {
    onDelete: 'CASCADE',
  })
  signature: CrewSignature;

  @Column({ nullable: true })
  memberName: string;

  @Column({ type: 'text' })
  danceVideoUrl: string;

  @Column({ type: 'date' })
  performedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  updatedBy: User;
}
