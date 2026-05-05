const express = require("express");
const router  = express.Router();
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/practices/today?user_id=xxx
router.get("/today", async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id required" });
  const today = new Date().toISOString().split("T")[0];
  try {
    const r = await pool.query(
      "SELECT practice_id, category FROM practice_logs WHERE user_id = $1 AND completed_at >= $2",
      [user_id, today + "T00:00:00"]
    );
    res.json({ logs: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/practices
router.post("/", async (req, res) => {
  const { user_id, practice_id, category, duration_sec } = req.body;
  if (!user_id || !category) return res.status(400).json({ error: "user_id and category required" });
  try {
    await pool.query(
      "INSERT INTO practice_logs (user_id, practice_id, category, duration_sec) VALUES ($1,$2,$3,$4)",
      [user_id, practice_id||null, category, duration_sec||0]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
