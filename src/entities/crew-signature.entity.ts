import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Crew } from './crew.entity';

@Entity()
export class CrewSignature {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Crew, (crew) => crew.signatures)
  crew: Crew;

  @Column()
  starballoonCount: number; // 별풍선 개수 기준

  @Column()
  songName: string; // 노래 이름

  @Column({ type: 'text' })
  signatureImageUrl: string; // 시그니처 사진 URL

  @Column({ type: 'text', nullable: true })
  danceVideoUrl: string; // 시그니처 춤 영상 URL

  @Column({ type: 'text', nullable: true })
  description: string; // 추가 설명

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
