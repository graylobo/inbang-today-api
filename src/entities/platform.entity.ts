import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserPlatformVerification } from 'src/entities/user-platform-verification.entity';
import { StreamerPlatform } from './streamer-platform.entity';

@Entity()
export class Platform extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // 'soop', 'chzzk', 'youtube', 'popkontv'

  @Column()
  displayName: string; // '숲', '치지직', '유튜브', '팝콘티비'

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(
    () => UserPlatformVerification,
    (verification) => verification.platform,
  )
  verifications: UserPlatformVerification[];

  @OneToMany(
    () => StreamerPlatform,
    (streamerPlatform) => streamerPlatform.platform,
  )
  streamers: StreamerPlatform[];
}
