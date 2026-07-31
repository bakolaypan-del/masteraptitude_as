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

    // 1. Update Mock-02 metadata and sub_category in database
    const testId = 'rrb_ntpc_grad_cbt1_gs_sec31_70';
    const testMeta = {
      subCategory: 'UG Level',
      examDate: '07/05/2026',
      examTime: '12:45 PM - 2:15 PM',
      testDate: '07/05/2026',
      testTime: '12:45 PM - 2:15 PM',
      examName: 'RRB NTPC UnderGraduate CBT I',
      subject: 'GS/Gk sectional Mock -02 (07/05/2026, 12:45 PM - 2:15 PM)',
      questionCount: 40,
      passMarks: 16,
      totalMarks: 40,
      language: 'Bilingual (English & Bengali)'
    };

    await client.query(
      `UPDATE tests SET 
        subject_name = 'RRB NTPC UnderGraduate CBT I',
        description = 'RRB NTPC UnderGraduate CBT I GS/Gk sectional Mock -02. Conducted Date: 07/05/2026, Test Time: 12:45 PM - 2:15 PM.',
        metadata = $2
       WHERE id = $1`,
      [testId, JSON.stringify(testMeta)]
    );

    // Also update Mock-01 metadata so subCategory is 'UG Level'
    const testId1 = 'rrb_ntpc_ug_cbt1_gs_sec31_70';
    const testMeta1 = {
      subCategory: 'UG Level',
      examDate: '07/05/2026',
      examTime: '9:00 AM - 10:30 AM',
      testDate: '07/05/2026',
      testTime: '9:00 AM - 10:30 AM',
      examName: 'RRB NTPC UnderGraduate CBT I',
      subject: 'GS/Gk sectional Mock -01 (07/05/2026, 9:00 AM - 10:30 AM)',
      questionCount: 40,
      passMarks: 16,
      totalMarks: 40,
      language: 'Bilingual (English & Bengali)'
    };

    await client.query(
      `UPDATE tests SET 
        metadata = $2
       WHERE id = $1`,
      [testId1, JSON.stringify(testMeta1)]
    );

    console.log("✓ Successfully updated both Mock-01 and Mock-02 subCategory to 'UG Level'!");

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error updating mock subcategories:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
