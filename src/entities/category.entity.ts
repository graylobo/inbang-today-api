import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { StreamerCategory } from './streamer-category.entity';
import { BaseEntity } from './base.entity';

/**
 * 방송 카테고리 엔티티
 * - 게임, 스포츠, 정치 등 다양한 방송 카테고리 정보를 관리
 */
@Entity()
export class Category extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  iconUrl: string;

  // 부모 카테고리 (선택 사항 - 계층 구조 지원)
  @Column({ nullable: true })
  parentId: number;

  // 카테고리 정렬 순서
  @Column({ default: 0 })
  sortOrder: number;

  // 스트리머-카테고리 관계
  @OneToMany(
    () => StreamerCategory,
    (streamerCategory) => streamerCategory.category,
  )
  streamerCategories: StreamerCategory[];
}
