import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { CrewRank } from './crew-rank.entity';
import { CrewBroadcast } from './crew-broadcast.entity';
import { CrewSignature } from './crew-signature.entity';
import { UserCrewPermission } from './user-crew-permission.entity';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';
import { StreamerPlatform } from './streamer-platform.entity';

@Entity()
export class Crew extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  iconUrl: string;

  @Column({ nullable: true })
  signatureOverviewImageUrl: string;

  @ManyToOne(() => User, { nullable: true })
  signatureOverviewImageUpdatedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  signatureOverviewImageUpdatedAt: Date;

  @OneToMany(() => StreamerPlatform, (member) => member.crew)
  platformMembers: StreamerPlatform[];

  @OneToMany(() => CrewRank, (rank) => rank.crew)
  ranks: CrewRank[];

  @OneToMany(() => CrewBroadcast, (broadcast) => broadcast.crew)
  broadcasts: CrewBroadcast[];

  @OneToMany(() => CrewSignature, (signature) => signature.crew)
  signatures: CrewSignature[];

  @OneToMany(() => UserCrewPermission, (permission) => permission.crew)
  userPermissions: UserCrewPermission[];
}
