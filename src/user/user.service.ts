import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { RoleService } from '../role/role.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly roleService: RoleService,
  ) {}

  async create(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string,
  ): Promise<User> {
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const roleEntity = await this.roleService.findByName(role);
    if (!roleEntity) {
      throw new Error(`Role '${role}' not found`);
    }
    const user = this.userRepo.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      roleId: roleEntity.id,
    });
    return this.userRepo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async setOtp(userId: string, otp: number, expiresAt: Date): Promise<void> {
    await this.userRepo.update(
      { id: userId },
      { otp, otpExpires: expiresAt },
    );
  }

  async markVerified(userId: string): Promise<void> {
    await this.userRepo.update(
      { id: userId },
      { isVerify: true, otp: null, otpExpires: null },
    );
  }

  async updateProfile(
    userId: string,
    data: Partial<Pick<User, 'firstName' | 'lastName'>>,
  ): Promise<User> {
    await this.userRepo.update({ id: userId }, data);
    return this.userRepo.findOneByOrFail({ id: userId });
  }
}
