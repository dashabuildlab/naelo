const express = require("express");
const router  = express.Router();
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/checkins?user_id=xxx&days=30
router.get("/", async (req, res) => {
  const { user_id, days } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id required" });
  const daysNum = Math.min(parseInt(days) || 30, 365);
  const since = new Date();
  since.setDate(since.getDate() - (daysNum - 1));
  const sinceStr = since.toISOString().split("T")[0];
  try {
    const r = await pool.query(
      "SELECT * FROM daily_checkins WHERE user_id = $1 AND date >= $2 ORDER BY date DESC",
      [user_id, sinceStr]
    );
    res.json({ checkins: r.rows.map(row => ({
      ...row,
      date: row.date instanceof Date
        ? row.date.toISOString().split("T")[0]
        : String(row.date).split("T")[0],
    }))});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/checkins/today?user_id=xxx
router.get("/today", async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id required" });
  const today = new Date().toISOString().split("T")[0];
  try {
    const r = await pool.query(
      "SELECT id FROM daily_checkins WHERE user_id = $1 AND date = $2",
      [user_id, today]
    );
    res.json({ exists: r.rows.length > 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/checkins — upsert
router.post("/", async (req, res) => {
  const { user_id, date, energy, note, question, hints, delta } = req.body;
  if (!user_id || !date) return res.status(400).json({ error: "user_id and date required" });
  try {
    const r = await pool.query(`
      INSERT INTO daily_checkins (user_id, date, energy, note, question, hints, delta)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (user_id, date) DO UPDATE SET
        energy   = EXCLUDED.energy,
        note     = EXCLUDED.note,
        question = EXCLUDED.question,
        hints    = EXCLUDED.hints,
        delta    = EXCLUDED.delta
      RETURNING *
    `, [user_id, date, energy??50, note||null, question||null, hints||null, delta??0]);
    res.json({ checkin: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
