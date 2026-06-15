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
    const connectionString = process.env.DATABASE_URL;
    let servername: string | undefined = undefined;
    if (connectionString) {
      try {
        servername = new URL(connectionString).hostname;
      } catch (e) {}
    }

    const useSSL = connectionString?.includes('supabase') || connectionString?.includes('render') || process.env.NODE_ENV === 'production';

    super({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString,
          ssl: useSSL
            ? { rejectUnauthorized: false, servername }
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
