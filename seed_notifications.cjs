const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URI,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create notifications table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)
      );
    `);
    console.log("✓ 'notifications' table verified/created.");

    const notifications = [
      {
        id: 'notif_wbpsc_clerkship_2019',
        data: {
          id: 'notif_wbpsc_clerkship_2019',
          title: '🎯 New Official PYQ Paper Added!',
          message: 'WB PSC Clerkship 2019 (1st Shift) Official PYQ Full Mock Test with 100 bilingual questions and step-by-step solutions is now live under Previous Year Papers!',
          category: 'WBPSC',
          type: 'pyq',
          testId: 'wbpsc_clerkship_2019_shift1_pyq',
          targetTab: 'pyq',
          isPinned: true,
          createdAt: Date.now() - 1800000 // 30 mins ago
        }
      },
      {
        id: 'notif_wbpsc_gs_sec2',
        data: {
          id: 'notif_wbpsc_gs_sec2',
          title: '📚 New GS Sectional Mock Published!',
          message: 'WB PSC Clerkship 2019 (1st Shift) General Studies Sectional Mock (40 Qs, 40 Mins) is now available under WPSC Sectional Mocks.',
          category: 'WPSC',
          type: 'sectional',
          testId: 'wbpsc_clerkship_2019_shift1_gs_sec',
          targetTab: 'mock_sectional',
          isPinned: true,
          createdAt: Date.now() - 3600000 // 1 hr ago
        }
      },
      {
        id: 'notif_rrbtpc_ug_mock2',
        data: {
          id: 'notif_rrbtpc_ug_mock2',
          title: '🚂 Railway Sectional Mock Live!',
          message: 'GS/GK Sectional Mock -02 (40 Qs) is now available under UG Level in RAILWAY Sectional Mocks.',
          category: 'RAILWAY',
          type: 'sectional',
          testId: 'rrb_ntpc_grad_cbt1_gs_sec31_70',
          targetTab: 'mock_sectional',
          isPinned: false,
          createdAt: Date.now() - 7200000 // 2 hrs ago
        }
      }
    ];

    for (const item of notifications) {
      await client.query(`
        INSERT INTO notifications (id, data)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `, [item.id, JSON.stringify(item.data)]);
    }

    await client.query('COMMIT');
    console.log("✓ Successfully seeded student notification announcements!");

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error setting up notifications table:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
