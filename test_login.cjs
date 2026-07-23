const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString = process.env.SUPABASE_DB_URI;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function testLogin(inputEmailOrPhone, passwordToTest) {
  try {
    const client = await pool.connect();
    const digitsOnly = String(inputEmailOrPhone).replace(/\D/g, '');
    const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : '';
    const pseudoEmail = cleanPhone ? `${cleanPhone}@students.myapp.com` : '';

    console.log("Testing login query for:", { inputEmailOrPhone, cleanPhone, pseudoEmail, passwordToTest });

    const userRes = await client.query(
      "SELECT * FROM users WHERE email = $1 OR ($2 != '' AND email = $2) OR ($3 != '' AND phone_number IS NOT NULL AND phone_number = $3)",
      [inputEmailOrPhone, pseudoEmail, cleanPhone]
    );

    console.log("Matching users found count:", userRes.rows.length);

    if (userRes.rows.length === 0) {
      console.log("RESULT: User not found!");
      client.release();
      return;
    }

    const user = userRes.rows[0];
    console.log("User details:", { id: user.id, email: user.email, phone: user.phone_number, password_hash: user.password_hash });

    if (!user.password_hash) {
      console.log("RESULT: Password not set!");
      client.release();
      return;
    }

    const isValid = bcrypt.compareSync(passwordToTest, user.password_hash);
    console.log("RESULT: bcrypt.compareSync result ->", isValid);

    client.release();
  } catch (err) {
    console.error("Error testing login:", err);
  } finally {
    await pool.end();
  }
}

testLogin("9735743932", "Bubun@1989");
