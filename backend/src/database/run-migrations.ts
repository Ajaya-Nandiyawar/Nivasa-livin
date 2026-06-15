import dns from 'dns';
dns.setDefaultResultOrder('verbatim');

import * as dotenv from 'dotenv';
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  console.log('Connecting to database for migrations...');
  const useSSL = connectionString.includes('supabase') || connectionString.includes('render') || process.env.NODE_ENV === 'production';
  console.log(`Connection string contains 'supabase': ${connectionString.includes('supabase')}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`Resolved useSSL: ${useSSL}`);
  
  let servername: string | undefined = undefined;
  try {
    const parsedUrl = new URL(connectionString);
    servername = parsedUrl.hostname;
    console.log(`Parsed SNI servername: ${servername}`);
  } catch (e) {
    console.warn('Could not parse hostname from connection string:', e);
  }

  const client = new Client({
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false, servername } : undefined
  });
  await client.connect();

  try {
    // Ensure migrations table exists to track applied migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__migrations" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Path to migration files
    let migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      // Try resolving relative to project root (in case of running from root/dist)
      migrationsDir = path.resolve(process.cwd(), 'src/database/migrations');
    }
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.resolve(process.cwd(), 'dist/database/migrations');
    }

    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    console.log(`Reading migration files from: ${migrationsDir}`);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // Check if already applied
      const checkRes = await client.query('SELECT 1 FROM "__migrations" WHERE name = $1', [file]);
      if (checkRes.rowCount && checkRes.rowCount > 0) {
        console.log(`Migration already applied: ${file}`);
        continue;
      }

      console.log(`Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Only execute the Up Migration section of the file
      const upSql = sql.split(/--\s*Down\s*Migration/i)[0].trim();

      await client.query('BEGIN');
      try {
        await client.query(upSql);
        await client.query('INSERT INTO "__migrations" (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Successfully applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('All migrations applied successfully.');
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Check if this script is executed directly
if (require.main === module) {
  runMigrations().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
