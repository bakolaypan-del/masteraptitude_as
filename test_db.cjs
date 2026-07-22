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

      const tables = [
        'users', 'tests', 'questions', 'results', 'typing_tests',
        'typing_results', 'custom_categories', 'carousel', 'affairs',
        'study_notes', 'videos', 'paid_mock_batches', 'student_reviews',
        'settings', 'review_links', 'news_posts'
      ];

      for (const table of tables) {
        try {
          const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
          console.log(`Table '${table}': ${res.rows[0].count} rows`);
        } catch (e) {
          console.log(`Table '${table}': Error: ${e.message}`);
        }
      }

      client.release();
    } catch (err) {
      console.error("Connection error:", err.message);
    } finally {
      await pool.end();
    }
  }

  test();
}
