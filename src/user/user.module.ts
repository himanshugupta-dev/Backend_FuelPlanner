import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RoleModule],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
