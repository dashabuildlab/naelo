const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/dreams?user_id=xxx  — load all dreams + steps
router.get("/", async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id required" });
  try {
    const dreamsRes = await pool.query(
      "SELECT * FROM dreams WHERE user_id = $1 ORDER BY created_at ASC",
      [user_id]
    );
    const dreams = dreamsRes.rows;

    if (dreams.length === 0) return res.json({ dreams: [] });

    const dreamIds = dreams.map((d) => d.id);
    const stepsRes = await pool.query(
      "SELECT * FROM dream_steps WHERE dream_id = ANY($1) ORDER BY sort_order ASC",
      [dreamIds]
    );
    const steps = stepsRes.rows;

    const result = dreams.map((d) => ({
      ...d,
      steps: steps.filter((s) => s.dream_id === d.id),
    }));

    res.json({ dreams: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/dreams  — create dream
router.post("/", async (req, res) => {
  const { user_id, title, description, why, deadline } = req.body;
  if (!user_id || !title) return res.status(400).json({ error: "user_id and title required" });
  try {
    const r = await pool.query(
      "INSERT INTO dreams (user_id, title, description, why, deadline) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [user_id, title, description || null, why || null, deadline || null]
    );
    res.json({ dream: { ...r.rows[0], steps: [] } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/dreams/:id  — update dream (verified)
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { verified } = req.body;
  try {
    await pool.query(
      "UPDATE dreams SET verified = $1, updated_at = NOW() WHERE id = $2",
      [verified, id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/dreams/:id  — delete dream + steps (CASCADE)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM dreams WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/dreams/steps  — add step
router.post("/steps", async (req, res) => {
  const { dream_id, user_id, title, sort_order } = req.body;
  if (!dream_id || !user_id || !title) return res.status(400).json({ error: "dream_id, user_id, title required" });
  try {
    const r = await pool.query(
      "INSERT INTO dream_steps (dream_id, user_id, title, sort_order) VALUES ($1, $2, $3, $4) RETURNING *",
      [dream_id, user_id, title, sort_order || 0]
    );
    res.json({ step: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/dreams/steps/:id  — toggle step done
router.patch("/steps/:id", async (req, res) => {
  const { id } = req.params;
  const { done } = req.body;
  try {
    await pool.query("UPDATE dream_steps SET done = $1 WHERE id = $2", [done, id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
