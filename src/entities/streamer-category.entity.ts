import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Category } from './category.entity';
import { Streamer } from './streamer.entity';

/**
 * 스트리머와 카테고리 간의 다대다 관계를 위한 조인 테이블
 */
@Entity()
export class StreamerCategory extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Streamer, (streamer) => streamer.streamerCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'streamer_id' })
  streamer: Streamer;

  @ManyToOne(() => Category, (category) => category.streamerCategories)
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
