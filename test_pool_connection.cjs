const { Pool } = require('pg');
require('dotenv').config();

console.log("Current SUPABASE_DB_URI from .env:", process.env.SUPABASE_DB_URI);

async function testConnection(connectionString, label) {
  console.log(`\n--- Testing ${label} ---`);
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000
  });

  try {
    const client = await pool.connect();
    console.log(`SUCCESS: Connected via ${label}!`);
    const res = await client.query("SELECT count(*) FROM users");
    console.log(`Query result: ${res.rows[0].count} users`);
    client.release();
  } catch (err) {
    console.error(`FAILURE on ${label}:`, err.message);
  } finally {
    await pool.end();
  }
}

async function runTests() {
  const currentUri = process.env.SUPABASE_DB_URI;
  await testConnection(currentUri, "Current .env URI");

  const port5432Uri = currentUri.replace(':6543', ':5432');
  await testConnection(port5432Uri, "Port 5432 URI");

  const port6543PgbouncerUri = currentUri.includes('?') ? `${currentUri}&pgbouncer=true` : `${currentUri}?pgbouncer=true`;
  await testConnection(port6543PgbouncerUri, "Port 6543 + pgbouncer=true");
}

runTests();
