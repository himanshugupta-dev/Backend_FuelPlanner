import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFirstLastNameColumnsToUsers1680000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" varchar NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" varchar NOT NULL DEFAULT ''`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'users'
            AND column_name = 'name'
        ) THEN
          UPDATE "users"
          SET "firstName" = split_part("name", ' ', 1),
              "lastName" = regexp_replace("name", '^\\S+\\s*', '')
          WHERE "name" IS NOT NULL;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "firstName"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "lastName"',
    );
  }
}
