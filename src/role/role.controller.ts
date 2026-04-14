import { Controller, Get, Query } from '@nestjs/common';
import { RoleService } from './role.service';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('id')
  async getRoleId(@Query('name') name: string): Promise<{ id: string | null }> {
    const id = await this.roleService.getRoleIdByName(name);
    return { id };
  }
}
