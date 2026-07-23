const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.SUPABASE_DB_URI;

if (!connectionString) {
  console.error("SUPABASE_DB_URI is missing");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function purgeStudentUsers() {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL...");

    // Check count before deletion
    const beforeRes = await client.query("SELECT COUNT(*) FROM users");
    console.log(`Total users before cleanup: ${beforeRes.rows[0].count}`);

    // Check admins
    const adminRes = await client.query("SELECT id, email, role FROM users WHERE role = 'admin' OR LOWER(email) = 'bakolaypan@gmail.com'");
    console.log("Admin accounts to keep:", adminRes.rows);

    // Delete non-admin users
    const deleteRes = await client.query("DELETE FROM users WHERE role != 'admin' AND LOWER(email) != 'bakolaypan@gmail.com'");
    console.log(`Deleted ${deleteRes.rowCount} non-admin student user records from database.`);

    // Check count after deletion
    const afterRes = await client.query("SELECT COUNT(*) FROM users");
    console.log(`Total users remaining in database: ${afterRes.rows[0].count}`);

    client.release();
  } catch (err) {
    console.error("Error during purge:", err.message);
  } finally {
    await pool.end();
  }
}

purgeStudentUsers();
