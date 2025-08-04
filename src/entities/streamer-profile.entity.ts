import { BaseEntity } from 'src/entities/base.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Streamer } from './streamer.entity';
import { StreamerGender } from './types/streamer.type';

@Entity()
export class StreamerProfile extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  realName: string; // 실명

  @Column({
    type: 'enum',
    enum: StreamerGender,
    nullable: true,
  })
  gender: StreamerGender;

  @Column({ nullable: true })
  birthDate: Date; // 생년월일

  @Column({ nullable: true })
  nationality: string; // 국적

  @Column({ nullable: true })
  description: string; // 스트리머 소개

  @Column({ nullable: true })
  profileImage: string; // 기본 프로필 이미지

  @Column({ nullable: true })
  bannerImage: string; // 배너 이미지

  @Column({ nullable: true })
  website: string; // 개인 웹사이트

  @Column({ nullable: true })
  email: string; // 연락처 이메일

  @Column({ default: true })
  isPublic: boolean; // 공개 여부

  // Relations
  @OneToOne(() => Streamer, (streamer) => streamer.profile)
  @JoinColumn({ name: 'streamerId' })
  streamer: Streamer;
}
