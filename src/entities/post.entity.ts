import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Board } from './board.entity';
import { Comment } from './comment.entity';
import { User } from './user.entity';
import { BaseEntity } from 'src/entities/base.entity';
import { PostLike } from './post-like.entity';

@Entity()
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => Board, (board) => board.posts)
  board: Board;

  @ManyToOne(() => User, { nullable: true })
  author: User | null; // 익명 게시글의 경우 null

  @Column({ nullable: true })
  authorName: string; // 익명 게시글 작성자명

  @Column({ nullable: true })
  password: string; // 익명 게시글 비밀번호 (해시됨)

  @Column({ nullable: true })
  ipAddress: string; // 익명 게시글 작성자 IP 주소

  @Column({ default: 0 })
  viewCount: number;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @OneToMany(() => PostLike, (like) => like.post)
  likes: PostLike[];

  @Column({ default: 0 })
  likeCount: number; // 좋아요 수를 캐시하여 성능 최적화

  @Column({ default: 0 })
  dislikeCount: number; // 싫어요 수를 캐시하여 성능 최적화
}
