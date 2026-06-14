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
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase') || connectionString.includes('render') || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined
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

      await client.query('BEGIN');
      try {
        await client.query(sql);
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
