import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';

@Injectable()
export class RoleService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    await this.seedRoles();
  }

  private async seedRoles() {
    const roles = ['super-admin', 'vendor', 'user'];

    for (const roleName of roles) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleName },
      });
      if (!existingRole) {
        const role = this.roleRepository.create({ name: roleName });
        await this.roleRepository.save(role);
      }
    }
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { name } });
  }

  async getRoleIdByName(name: string): Promise<string | null> {
    const role = await this.findByName(name);
    return role ? role.id : null;
  }

  async getRoleNameById(id: string): Promise<string | null> {
    const role = await this.roleRepository.findOne({ where: { id } });
    return role ? role.name : null;
  }
}
