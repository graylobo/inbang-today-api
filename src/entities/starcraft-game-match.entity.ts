import { createHash } from 'crypto';
import { StarCraftMap } from 'src/entities/starcraft-map.entity';
import { Streamer } from 'src/entities/streamer.entity';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class StarCraftGameMatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  eloPoint: number;

  @Column()
  format: string;

  @Column({ nullable: true })
  memo: string;

  @Column({ unique: true })
  uniqueHash: string;

  @ManyToOne(() => Streamer, (streamer) => streamer.id)
  winner: Streamer;

  @ManyToOne(() => Streamer, (streamer) => streamer.id)
  loser: Streamer;

  @ManyToOne(() => StarCraftMap, (map) => map.id)
  map: StarCraftMap;

  static generateHash(data: {
    date: Date;
    winner: string;
    loser: string;
    map: string;
    format: string;
    memo?: string;
    eloPoint?: number;
  }): string {
    // 날짜를 일관된 형식으로 변환
    const formattedDate = data.date.toISOString().split('T')[0];

    // 모든 필드를 일관된 순서로 조합
    const uniqueString = [
      formattedDate,
      data.winner,
      data.loser,
      data.map,
      data.format,
      data.memo || '',
      data.eloPoint || '',
    ].join('_');

    return createHash('md5').update(uniqueString).digest('hex');
  }

  @BeforeInsert()
  @BeforeUpdate()
  generateUniqueHash() {
    this.uniqueHash = StarCraftGameMatch.generateHash({
      date: this.date,
      winner: this.winner.name,
      loser: this.loser.name,
      map: this.map.name,
      format: this.format,
      memo: this.memo,
      eloPoint: this.eloPoint,
    });
  }
}
