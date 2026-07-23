const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
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

async function setupSingleAdmin() {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL...");

    // 1. Delete remaining admin accounts except Suman Kolay
    const deleteRes = await client.query(
      "DELETE FROM users WHERE LOWER(email) != 'bakolaypan@gmail.com' AND id != '0SCqNillT6Xe4z3RQzVzinzYiV12'"
    );
    console.log(`Deleted ${deleteRes.rowCount} other accounts.`);

    // 2. Hash password Sumankolay@1995
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync("Sumankolay@1995", salt);

    // 3. Update or Insert Suman Kolay admin account
    const updateRes = await client.query(
      `UPDATE users 
       SET name = 'Suman Kolay',
           email = 'bakolaypan@gmail.com',
           phone_number = '9732710066',
           password_hash = $1,
           role = 'admin',
           status = 'active'
       WHERE LOWER(email) = 'bakolaypan@gmail.com' OR id = '0SCqNillT6Xe4z3RQzVzinzYiV12'
       RETURNING id, name, email, phone_number, role`,
      [hash]
    );

    if (updateRes.rows.length === 0) {
      // Insert if not present
      const uid = '0SCqNillT6Xe4z3RQzVzinzYiV12';
      const insertRes = await client.query(
        `INSERT INTO users (id, name, email, phone_number, password_hash, role, status, total_tests_taken, cumulative_score, global_rank)
         VALUES ($1, 'Suman Kolay', 'bakolaypan@gmail.com', '9732710066', $2, 'admin', 'active', 0, 0, 0)
         RETURNING id, name, email, phone_number, role`,
        [uid, hash]
      );
      console.log("Inserted single admin account:", insertRes.rows[0]);
    } else {
      console.log("Updated single admin account:", updateRes.rows[0]);
    }

    // 4. Verify total users in DB
    const finalRes = await client.query("SELECT id, name, email, phone_number, role FROM users");
    console.log("Current Users in DB (Total:", finalRes.rows.length, "):", finalRes.rows);

    client.release();
  } catch (err) {
    console.error("Error setting up single admin:", err.message);
  } finally {
    await pool.end();
  }
}

setupSingleAdmin();
