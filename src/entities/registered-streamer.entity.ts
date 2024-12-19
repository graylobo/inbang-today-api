import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class RegisteredStreamer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nickname: string; // 스트리머 닉네임

  @Column({ nullable: true })
  profileUrl: string;

  @Column({ default: false })
  isLive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenLive: Date;
}
