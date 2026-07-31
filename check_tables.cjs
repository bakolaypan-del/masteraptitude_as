const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URI,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const testsRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tests'");
    console.log("TESTS COLUMNS:", testsRes.rows.map(r => `${r.column_name} (${r.data_type})`));

    const qRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'questions'");
    console.log("QUESTIONS COLUMNS:", qRes.rows.map(r => `${r.column_name} (${r.data_type})`));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
