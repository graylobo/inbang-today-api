import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Board } from './board.entity';
import { User } from './user.entity';
import { Comment } from './comment.entity';

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => Board, (board) => board.posts)
  board: Board;

  @ManyToOne(() => User, { nullable: true })
  author: User | null;  // 익명 게시글의 경우 null

  @Column({ nullable: true })
  authorName: string;  // 익명 게시글 작성자명

  @Column({ nullable: true })
  password: string;  // 익명 게시글 비밀번호 (해시됨)

  @Column({ default: 0 })
  viewCount: number;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 