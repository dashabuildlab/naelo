const express = require("express");
const router  = express.Router();
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/profile?user_id=xxx
router.get("/", async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id required" });
  try {
    const r = await pool.query("SELECT * FROM profiles WHERE id = $1", [user_id]);
    res.json({ profile: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/profile — upsert
router.post("/", async (req, res) => {
  const { user_id, name, score, streak, goal, energy_drains, drains_text,
          concerns, concerns_text, givers_text, energy_givers } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id required" });
  try {
    await pool.query(`
      INSERT INTO profiles (id, name, score, streak, goal, energy_drains, drains_text,
        concerns, concerns_text, givers_text, energy_givers, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
      ON CONFLICT (id) DO UPDATE SET
        name           = COALESCE(EXCLUDED.name,          profiles.name),
        score          = COALESCE(EXCLUDED.score,         profiles.score),
        streak         = COALESCE(EXCLUDED.streak,        profiles.streak),
        goal           = COALESCE(EXCLUDED.goal,          profiles.goal),
        energy_drains  = COALESCE(EXCLUDED.energy_drains, profiles.energy_drains),
        drains_text    = COALESCE(EXCLUDED.drains_text,   profiles.drains_text),
        concerns       = COALESCE(EXCLUDED.concerns,      profiles.concerns),
        concerns_text  = COALESCE(EXCLUDED.concerns_text, profiles.concerns_text),
        givers_text    = COALESCE(EXCLUDED.givers_text,   profiles.givers_text),
        energy_givers  = COALESCE(EXCLUDED.energy_givers, profiles.energy_givers),
        updated_at     = NOW()
    `, [user_id, name||null, score??null, streak??null, goal||null,
        energy_drains||null, drains_text||null, concerns||null,
        concerns_text||null, givers_text||null, energy_givers||null]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/profile — часткове оновлення
router.patch("/", async (req, res) => {
  const { user_id, ...fields } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id required" });
  const allowed = ["name","score","streak","goal","energy_drains","drains_text",
                   "concerns","concerns_text","givers_text","energy_givers"];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return res.json({ ok: true });
  const set = updates.map(([k], i) => `${k} = $${i + 2}`).join(", ");
  const vals = [user_id, ...updates.map(([, v]) => v)];
  try {
    await pool.query(`UPDATE profiles SET ${set}, updated_at = NOW() WHERE id = $1`, vals);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/profile?user_id=xxx — видаляє всі дані користувача
router.delete("/", async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id required" });
  try {
    await Promise.all([
      pool.query("DELETE FROM daily_checkins WHERE user_id = $1", [user_id]),
      pool.query("DELETE FROM practice_logs  WHERE user_id = $1", [user_id]),
      pool.query("DELETE FROM dreams         WHERE user_id = $1", [user_id]),
    ]);
    await pool.query("DELETE FROM profiles WHERE id = $1", [user_id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
