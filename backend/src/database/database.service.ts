import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { DB } from './types'; // We will define this next

@Injectable()
export class DatabaseService
  extends Kysely<DB>
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_URL?.includes('supabase') || process.env.DATABASE_URL?.includes('render') || process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : undefined,
        }),
      }),
    });
  }

  async onModuleInit() {
    // Optionally test connection or run initial setup
  }

  async onModuleDestroy() {
    await this.destroy();
  }
}
