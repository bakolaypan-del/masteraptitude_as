const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URI,
  ssl: { rejectUnauthorized: false }
});

const subCategories = [
  { name: 'Under Graduate Level', icon: '🎓', desc: 'RRB NTPC Under Graduate CBT I & II Sectional Mocks' },
  { name: 'Graduate Level', icon: '📜', desc: 'RRB NTPC Graduate Level CBT I & II Sectional Mocks' },
  { name: 'ALP', icon: '🚂', desc: 'Assistant Loco Pilot CBT I & II Sectional Mocks' },
  { name: 'technician-III', icon: '🔧', desc: 'RRB Technician Grade III Sectional Practice Mocks' },
  { name: 'Group D', icon: '🛤️', desc: 'RRB Group D RRC Level 1 Sectional Mocks' }
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure custom_categories table has Railway subcategories registered with exact requested names
    for (const subCat of subCategories) {
      const catId = `railway_${subCat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
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
        subCat.name,
        'RAILWAY',
        subCat.icon,
        'indigo',
        1,
        Date.now(),
        JSON.stringify({ category: 'RAILWAY', subCategory: subCat.name, description: subCat.desc })
      ]);
    }

    // 2. Update test rrb_ntpc_ug_cbt1_gs_sec31_70 title and subcategory in tests table
    const testId = 'rrb_ntpc_ug_cbt1_gs_sec31_70';
    const newTitle = 'GS/Gk sectional Mock -01 (07/05/2026, 9:00 AM - 10:30 AM)';
    const testMeta = {
      subCategory: 'Under Graduate Level',
      examDate: '07/05/2026',
      examTime: '9:00 AM - 10:30 AM',
      testDate: '07/05/2026',
      testTime: '9:00 AM - 10:30 AM',
      examName: 'RRB NTPC UnderGraduate CBT I',
      subject: 'GS/Gk sectional Mock -01',
      questionCount: 40,
      passMarks: 16,
      totalMarks: 40,
      language: 'Bilingual (English & Bengali)'
    };

    await client.query(
      `UPDATE tests SET 
        title = $2,
        topic = 'General Awareness',
        subject_name = 'RRB NTPC UnderGraduate CBT I',
        description = 'RRB NTPC UnderGraduate CBT I GS/Gk sectional Mock -01. Conducted Date: 07/05/2026, Test Time: 9:00 AM - 10:30 AM.',
        metadata = $3
       WHERE id = $1`,
      [testId, newTitle, JSON.stringify(testMeta)]
    );
    console.log(`✓ Test updated title: '${newTitle}', Subcategory: 'Under Graduate Level'!`);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error in update_test_title_and_subcat:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
