import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from './src/user/user.entity';
import { Role } from './src/role/role.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'root',
  database: process.env.DB_NAME ?? 'fuel_planner',
  entities: [User, Role],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
