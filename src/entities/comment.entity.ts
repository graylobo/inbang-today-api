import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Post } from './post.entity';
import { User } from './user.entity';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => Post, (post) => post.comments)
  post: Post;

  @ManyToOne(() => User, { nullable: true })
  author: User | null; // 익명 댓글의 경우 null

  @Column({ nullable: true })
  authorName: string; // 익명 댓글 작성자명

  @Column({ nullable: true })
  password: string; // 익명 댓글 비밀번호 (해시됨)

  @ManyToOne(() => Comment, (comment) => comment.replies, { nullable: true })
  parent: Comment | null; // 대댓글인 경우 부모 댓글

  @OneToMany(() => Comment, (comment) => comment.parent)
  replies: Comment[]; // 대댓글 목록

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
