const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URI,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type 
      from information_schema.columns 
      WHERE table_name = 'pyqs'
    `);
    console.log("COLUMNS IN 'pyqs' TABLE:");
    res.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));
  } catch (err) {
    console.error("Error inspecting pyqs table:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
