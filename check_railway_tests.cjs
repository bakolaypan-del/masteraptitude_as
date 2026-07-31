const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URI,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT id, title, category, topic, subject_name, metadata FROM tests WHERE category = 'RAILWAY'");
    console.log("RAILWAY TESTS IN DB:");
    res.rows.forEach(r => {
      console.log(`- ID: ${r.id} | Title: ${r.title} | meta_subCat: ${r.metadata?.subCategory}`);
    });

    for (const r of res.rows) {
      const meta = r.metadata || {};
      meta.subCategory = 'UG Level';
      meta.examName = 'RRB NTPC UnderGraduate CBT I';
      await client.query("UPDATE tests SET metadata = $2 WHERE id = $1", [r.id, JSON.stringify(meta)]);
    }
    console.log("✓ Updated all RAILWAY tests metadata to subCategory = 'UG Level'!");

  } catch (err) {
    console.error("Error checking/updating tests:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
