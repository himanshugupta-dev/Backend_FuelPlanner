import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserStatus {
  ACTIVE = 'active',
  DEACTIVE = 'deactive',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: '' })
  firstName: string;

  @Column({ default: '' })
  lastName: string;

  @Column({ type: 'varchar', default: '' })
  roleId: string;

  @Column({ type: 'int', default: 0 })
  parentId: number;

  @Column({ type: 'boolean', default: false })
  isVerify: boolean;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'int', nullable: true })
  otp: number | null;

  @Column({ type: 'timestamp', nullable: true })
  otpExpires: Date | null;

  // 🔹 Forgot Password Fields

  @Column({ nullable: true })
  resetPasswordToken: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
