const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.SUPABASE_DB_URI;

if (connectionString) {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  async function test() {
    try {
      const client = await pool.connect();
      console.log("Connected successfully!");

      const res = await client.query("SELECT * FROM users");
      console.log("All users in DB:", res.rows);

      client.release();
    } catch (err) {
      console.error("Connection error:", err.message);
    } finally {
      await pool.end();
    }
  }

  test();
}
