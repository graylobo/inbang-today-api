import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { CrewEarning } from './crew-earning.entity';
import { StreamerCategory } from './streamer-category.entity';
import { StreamerEloRecord } from './streamer-elo-record.entity';
import { StreamerPlatform } from './streamer-platform.entity';
import { StreamerProfile } from './streamer-profile.entity';
import { StreamerGameProfile } from './streamer-game-profile.entity';

@Entity()
export class Streamer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // 스트리머의 기본 이름 (시스템 내 고유명)

  @Column({ nullable: true, unique: true })
  nickname: string; // 닉네임 (선택사항)

  @OneToMany(() => CrewEarning, (earning) => earning.member)
  earnings: CrewEarning[];

  @OneToMany(
    () => StreamerCategory,
    (streamerCategory) => streamerCategory.streamer,
  )
  streamerCategories: StreamerCategory[];

  @OneToMany(() => StreamerEloRecord, (eloRecord) => eloRecord.streamer)
  eloRecords: StreamerEloRecord[];

  @OneToMany(() => StreamerPlatform, (platform) => platform.streamer)
  platforms: StreamerPlatform[];

  @OneToOne(() => StreamerProfile, (profile) => profile.streamer)
  profile: StreamerProfile;

  @OneToMany(() => StreamerGameProfile, (gameProfile) => gameProfile.streamer)
  gameProfiles: StreamerGameProfile[];
}
