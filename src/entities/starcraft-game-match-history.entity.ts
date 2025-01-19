import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class StarCraftGameMatchHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  matchId: number;

  @Column()
  changeTimestamp: Date;

  @Column()
  previousHash: string;

  @Column()
  newHash: string;

  @Column({ type: 'jsonb' })
  previousData: {
    date: Date;
    winner: string;
    loser: string;
    map: string;
    format: string;
    memo?: string;
    eloPoint?: number;
  };

  @Column({ type: 'jsonb' })
  newData: {
    date: Date;
    winner: string;
    loser: string;
    map: string;
    format: string;
    memo?: string;
    eloPoint?: number;
  };

  @Column()
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
}
