import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { MailService } from '../mail/mail.service';
import { RoleService } from '../role/role.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MESSAGES } from '../config/messages';

@Injectable()
export class AuthService {
  private static readonly OTP_TTL_MINUTES = 10;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly roleService: RoleService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.userService.create(
      dto.email,
      dto.password,
      dto.firstName,
      dto.lastName,
      dto.role,
    );

    const otp = this.generateOtp();
    const expiresAt = new Date(
      Date.now() + AuthService.OTP_TTL_MINUTES * 60 * 1000,
    );
    await this.userService.setOtp(user.id, Number(otp), expiresAt);

    await this.mailService.sendOtpEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
      otp,
    );

    return {
      message: MESSAGES.REGISTRATION_SUCCESS,
      email: user.email,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER_NOT_FOUND);
    }

    if (user.isVerify) {
      throw new BadRequestException(MESSAGES.ACCOUNT_ALREADY_VERIFIED);
    }

    if (!user.otp || !user.otpExpires) {
      throw new BadRequestException(MESSAGES.NO_VERIFICATION_CODE);
    }

    if (user.otpExpires.getTime() < Date.now()) {
      throw new BadRequestException(MESSAGES.VERIFICATION_CODE_EXPIRED);
    }

    if (String(user.otp) !== dto.otp) {
      throw new BadRequestException(MESSAGES.INVALID_VERIFICATION_CODE);
    }

    await this.userService.markVerified(user.id);
    const roleName = await this.roleService.getRoleNameById(user.roleId);
    return {
      message: MESSAGES.EMAIL_VERIFIED_SUCCESS,
      ...this.buildUserResponse(user, roleName),
      ...this.buildTokenResponse(user.id, user.email),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(MESSAGES.INVALID_CREDENTIALS);
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException(MESSAGES.INVALID_CREDENTIALS);
    }

    if (!user.isVerify) {
      throw new UnauthorizedException(MESSAGES.VERIFY_EMAIL_FIRST);
    }

    const roleName = await this.roleService.getRoleNameById(user.roleId);
    return {
      ...this.buildUserResponse(user, roleName),
      ...this.buildTokenResponse(user.id, user.email),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userService.updateProfile(userId, dto);
    const roleName = await this.roleService.getRoleNameById(user.roleId);
    return {
      message: MESSAGES.PROFILE_UPDATED,
      ...this.buildUserResponse(user, roleName),
    };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private buildTokenResponse(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  private buildUserResponse(user: User, roleName: string | null) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleName: roleName ?? '',
    };
  }
}
