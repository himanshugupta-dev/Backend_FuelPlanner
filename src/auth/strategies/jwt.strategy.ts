import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { RoleService } from '../../role/role.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly userService: UserService,
    private readonly roleService: RoleService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET', 'default_jwt_secret'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    const roleName = await this.roleService.getRoleNameById(user.roleId);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleName: roleName ?? '',
    };
  }
}
