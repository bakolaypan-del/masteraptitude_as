const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URI,
  ssl: { rejectUnauthorized: false }
});

const subCategories = [
  'Under Graduate',
  'Graduate',
  'ALP',
  'TECHNICIAN-III',
  'GROUP D'
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure custom_categories table has Railway subcategories registered
    for (const subCat of subCategories) {
      const catId = `railway_${subCat.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const query = `
        INSERT INTO custom_categories (id, category_name, category_type, icon, color_theme, status, created_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          category_name = EXCLUDED.category_name,
          category_type = EXCLUDED.category_type,
          metadata = EXCLUDED.metadata;
      `;
      await client.query(query, [
        catId,
        subCat,
        'RAILWAY',
        '🚆',
        'blue',
        1,
        Date.now(),
        JSON.stringify({ category: 'RAILWAY', subCategory: subCat })
      ]);
    }
    console.log("✓ Successfully registered RAILWAY subcategories (Under Graduate, Graduate, ALP, TECHNICIAN-III, GROUP D) in custom_categories!");

    // 2. Update test rrb_ntpc_ug_cbt1_gs_sec31_70 metadata with Exam Date & Test Time & Subcategory
    const testId = 'rrb_ntpc_ug_cbt1_gs_sec31_70';
    const testMeta = {
      subCategory: 'Under Graduate',
      testDate: '07/05/2026',
      testTime: '9:00 AM - 10:30 AM',
      examName: 'RRB NTPC UnderGraduate CBT I',
      subject: 'RRB NTPC UnderGraduate CBT I',
      questionCount: 40,
      passMarks: 16,
      totalMarks: 40,
      language: 'Bilingual (English & Bengali)'
    };

    await client.query(
      `UPDATE tests SET 
        topic = 'General Awareness',
        subject_name = 'RRB NTPC UnderGraduate CBT I',
        description = 'RRB NTPC UnderGraduate CBT I - General Awareness Sectional Mock Test (Q31-70). Conducted Date: 07/05/2026, Test Time: 9:00 AM - 10:30 AM.',
        metadata = $2
       WHERE id = $1`,
      [testId, JSON.stringify(testMeta)]
    );
    console.log(`✓ Successfully updated test '${testId}' metadata with Test Date (07/05/2026) and Time (9:00 AM - 10:30 AM)!`);

    // 3. Clean options in database questions table to strip any duplicate leading A. / B. / C. / D.
    const qRes = await client.query("SELECT id, options, correct_answer FROM questions WHERE test_id = $1", [testId]);
    for (const row of qRes.rows) {
      if (Array.isArray(row.options)) {
        const cleanedOpts = row.options.map(opt => {
          if (typeof opt === 'string') {
            return opt.replace(/^(?:\([A-F]\)\s*|[A-F][\.\):]\s*)+/i, '').trim();
          }
          return opt;
        });

        await client.query("UPDATE questions SET options = $1 WHERE id = $2", [cleanedOpts, row.id]);
      }
    }
    console.log("✓ Successfully cleaned options in questions table to eliminate double prefixes!");

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error in seed_railway_subcategories:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
