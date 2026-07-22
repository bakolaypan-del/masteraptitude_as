const { Pool } = require('pg');
require('dotenv').config();

// Reconstruct logic from server.ts
const collectionTableMap = {
  profiles: "users",
  tests: "tests",
  questions: "questions",
  results: "results"
};

const tableColumnMap = {
  users: {
    id: "id",
    name: "name",
    email: "email",
    studentEmail: "email",
    phoneNumber: "phone_number",
    role: "role",
    totalTestsTaken: "total_tests_taken",
    cumulativeScore: "cumulative_score",
    globalRank: "global_rank",
    status: "status",
    lastTestAt: "last_test_at"
  }
};

function mapFieldName(table, jsKey) {
  if (jsKey === "id") return "id";
  const colMap = tableColumnMap[table];
  if (!colMap) return null;
  return colMap[jsKey] || null;
}

function mapRowToJs(table, row) {
  if (!row) return null;
  if (!tableColumnMap[table]) {
    return row.data || {};
  }
  const data = row.metadata ? { ...row.metadata } : {};
  const colMap = tableColumnMap[table];
  for (const [jsKey, dbCol] of Object.entries(colMap)) {
    if (row[dbCol] !== undefined && row[dbCol] !== null) {
      data[jsKey] = row[dbCol];
    }
  }
  return data;
}

const connectionString = process.env.SUPABASE_DB_URI;
if (connectionString) {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  async function test() {
    try {
      const client = await pool.connect();
      console.log("Connected to Postgres");

      // Build Query
      const table = collectionTableMap["profiles"];
      const clauses = [{ field: 'role', op: 'in', val: ['user', 'student'] }];
      
      let sql = `SELECT * FROM ${table}`;
      const params = [];
      const whereClauses = [];

      for (const clause of clauses) {
        const dbCol = mapFieldName(table, clause.field);
        if (!dbCol) continue;

        let op = "=";
        if (clause.op === "==") op = "=";

        if (clause.op === "in") {
          params.push(clause.val);
          whereClauses.push(`${dbCol} = ANY($${params.length})`);
        } else {
          params.push(clause.val);
          whereClauses.push(`${dbCol} ${op} $${params.length}`);
        }
      }

      if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
      }

      console.log("SQL Query:", sql);
      console.log("Params:", params);

      const res = await client.query(sql, params);
      console.log("Returned row count from query:", res.rows.length);
      if (res.rows.length > 0) {
        const jsData = mapRowToJs(table, res.rows[0]);
        console.log("Sample mapped user:", jsData);
      }

      client.release();
    } catch (e) {
      console.error("Error:", e.message);
    } finally {
      await pool.end();
    }
  }

  test();
}
