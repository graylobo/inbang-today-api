import { Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Column } from 'typeorm';

@Entity()
export class StarCraftMap {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;
}
