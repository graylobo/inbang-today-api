import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Post } from './post.entity';

@Entity()
export class Board {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // 게시판 이름

  @Column({ unique: true })
  slug: string; // URL용 식별자 (예: 'free', 'anonymous', 'incident')

  @Column({ default: false })
  isAnonymous: boolean; // 익명 게시판 여부

  @Column({ type: 'text', nullable: true })
  description: string; // 게시판 설명

  @OneToMany(() => Post, (post) => post.board)
  posts: Post[];
}
