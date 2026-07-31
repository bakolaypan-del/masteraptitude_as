const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URI,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'custom_categories'");
    console.log("CUSTOM_CATEGORIES COLUMNS:", res.rows.map(r => `${r.column_name} (${r.data_type})`));
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
