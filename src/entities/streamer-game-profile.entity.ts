import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Streamer } from './streamer.entity';
import { StarCraftRace } from './types/streamer.type';

@Entity()
export class StreamerGameProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  gameType: string; // 'starcraft', 'lol', 'valorant' 등

  @Column({ nullable: true })
  gameId: string; // 게임에서의 고유 ID (eloBoardId 등)

  @Column({
    type: 'enum',
    enum: StarCraftRace,
    nullable: true,
  })
  race: StarCraftRace; // 스타크래프트 종족

  @Column({ nullable: true })
  tier: string; // 티어 정보

  @Column({ nullable: true })
  rank: string; // 랭크 정보

  @Column({ nullable: true })
  mmr: number; // MMR 점수

  @Column({ nullable: true })
  winCount: number; // 승리 수

  @Column({ nullable: true })
  loseCount: number; // 패배 수

  @Column({ nullable: true })
  winRate: number; // 승률

  @Column({ nullable: true })
  totalGames: number; // 총 게임 수

  @Column({ nullable: true })
  lastGameAt: Date; // 마지막 게임 시간

  @Column({ default: true })
  isActive: boolean; // 해당 게임에서 활동 중인지 여부

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Streamer, (streamer) => streamer.gameProfiles)
  streamer: Streamer;
}
