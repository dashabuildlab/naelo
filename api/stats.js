const express = require("express");
const router  = express.Router();
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/stats?user_id=xxx&days=7
router.get("/", async (req, res) => {
  const { user_id, days } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id required" });

  const daysNum = Math.min(parseInt(days) || 7, 365);
  const since = new Date();
  since.setDate(since.getDate() - (daysNum - 1));
  const sinceStr = since.toISOString().split("T")[0];

  try {
    const [checkinsRes, practicesRes, profileRes] = await Promise.all([
      pool.query(
        "SELECT date, energy FROM daily_checkins WHERE user_id = $1 AND date >= $2 ORDER BY date ASC",
        [user_id, sinceStr]
      ),
      pool.query(
        "SELECT category FROM practice_logs WHERE user_id = $1 AND completed_at >= $2",
        [user_id, sinceStr + "T00:00:00"]
      ),
      pool.query(
        "SELECT streak FROM profiles WHERE id = $1",
        [user_id]
      ),
    ]);

    res.json({
      checkins:  checkinsRes.rows.map(r => ({
        date:   r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date).split("T")[0],
        energy: r.energy,
      })),
      practices: practicesRes.rows,
      streak:    profileRes.rows[0]?.streak || 0,
    });
  } catch (e) {
    console.error("stats error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
