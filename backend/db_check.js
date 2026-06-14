const { Client } = require('pg');

async function check() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public'
  });
  await client.connect();
  console.log('Connected to database.');
  
  const tables = [
    'users',
    'properties',
    'floors',
    'rooms',
    'beds',
    'tenants',
    'bookings',
    'rent_records',
    'payments',
    'expense_categories',
    'expenses',
    'maintenance_tickets'
  ];
  
  for (const table of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) FROM "${table}"`);
      console.log(`Table "${table}": ${res.rows[0].count} rows`);
    } catch (err) {
      console.error(`Error querying "${table}":`, err.message);
    }
  }
  
  await client.end();
}

check().catch(console.error);
