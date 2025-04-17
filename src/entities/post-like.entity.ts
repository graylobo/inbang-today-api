import { Entity, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Post } from './post.entity';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';

@Entity()
export class PostLike extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Post, (post) => post.likes)
  post: Post;

  @ManyToOne(() => User, { nullable: true })
  user: User | null; // 익명 사용자의 경우 null

  @Column({ nullable: true })
  ipAddress: string; // 익명 사용자의 경우 IP 주소로 식별

  @Column({ default: false })
  isDislike: boolean; // 싫어요 여부 (true: 싫어요, false: 좋아요)
}
