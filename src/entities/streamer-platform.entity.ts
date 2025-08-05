import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Streamer } from './streamer.entity';
import { Platform } from './platform.entity';
import { Crew } from './crew.entity';
import { CrewRank } from './crew-rank.entity';

@Entity()
export class StreamerPlatform {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  platformStreamerId: string; // 플랫폼에서의 고유 ID (soopId, chzzkId 등)

  @Column({ nullable: true })
  platformUsername: string; // 플랫폼에서의 사용자명

  @Column({ nullable: true })
  platformDisplayName: string; // 플랫폼에서의 표시명

  @Column({ nullable: true })
  platformProfileImage: string; // 플랫폼에서의 프로필 이미지

  @Column({ default: true })
  isActive: boolean; // 해당 플랫폼에서 활동 중인지 여부

  @Column({ nullable: true })
  lastActivityAt: Date; // 마지막 활동 시간

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Streamer, (streamer) => streamer.platforms)
  streamer: Streamer;

  @ManyToOne(() => Platform, (platform) => platform.streamers)
  platform: Platform;

  @ManyToOne(() => Crew, (crew) => crew.platformMembers)
  crew: Crew;

  @ManyToOne(() => CrewRank, (rank) => rank.platformMembers)
  crewRank: CrewRank;
}
