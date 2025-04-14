import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserCrewPermission } from './user-crew-permission.entity';

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  socialId: string;

  @Column({ nullable: true })
  password: string;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: false })
  isSuperAdmin: boolean;

  @OneToMany(() => UserCrewPermission, (permission) => permission.user)
  crewPermissions: UserCrewPermission[];
}
