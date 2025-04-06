import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Streamer } from './streamer.entity';
import { CrewRank } from './crew-rank.entity';
import { CrewBroadcast } from './crew-broadcast.entity';
import { CrewSignature } from './crew-signature.entity';
import { UserCrewPermission } from './user-crew-permission.entity';
import { BaseEntity } from './base.entity';

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

  @OneToMany(() => Streamer, (member) => member.crew)
  members: Streamer[];

  @OneToMany(() => CrewRank, (rank) => rank.crew)
  ranks: CrewRank[];

  @OneToMany(() => CrewBroadcast, (broadcast) => broadcast.crew)
  broadcasts: CrewBroadcast[];

  @OneToMany(() => CrewSignature, (signature) => signature.crew)
  signatures: CrewSignature[];

  @OneToMany(() => UserCrewPermission, (permission) => permission.crew)
  userPermissions: UserCrewPermission[];
}
