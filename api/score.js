const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function calculateScore(userId) {
  try {
    const r = await pool.query(
      "SELECT score FROM profiles WHERE id = $1",
      [userId]
    );
    return r.rows[0]?.score || 50;
  } catch {
    return 50;
  }
}

module.exports = { calculateScore };
