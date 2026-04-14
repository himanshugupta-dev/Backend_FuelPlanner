import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum Status {
  ACTIVE = 'active',
  DEACTIVE = 'deactive',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;

  @CreateDateColumn()
  createdAt: Date;
}
