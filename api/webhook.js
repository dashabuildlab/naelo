// api/webhook.js — RevenueCat webhook handler
const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ініціалізуємо таблицю при старті (якщо ще не існує)
pool.query(`
  CREATE TABLE IF NOT EXISTS user_subscriptions (
    user_id       TEXT PRIMARY KEY,
    is_premium    BOOLEAN DEFAULT FALSE,
    product_id    TEXT,
    expires_at    TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => console.error("[webhook] init table error:", e.message));

// RevenueCat event types
const ACTIVE_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "BILLING_ISSUE_RESOLVED",
]);
const INACTIVE_EVENTS = new Set([
  "CANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
  "SUBSCRIBER_ALIAS",
]);

// POST /api/webhooks/revenuecat
router.post("/revenuecat", async (req, res) => {
  // Перевірка секрету (встановлюється в RC Dashboard → Webhooks → Authorization)
  const secret = process.env.RC_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers["authorization"];
    if (auth !== secret) {
      console.warn("[webhook] unauthorized attempt");
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const event = req.body?.event;
  if (!event) return res.status(400).json({ error: "No event" });

  const { type, app_user_id, product_id, expiration_at_ms } = event;
  if (!app_user_id) return res.status(400).json({ error: "No app_user_id" });

  const expiresAt = expiration_at_ms ? new Date(expiration_at_ms) : null;

  try {
    if (ACTIVE_EVENTS.has(type)) {
      await pool.query(
        `INSERT INTO user_subscriptions (user_id, is_premium, product_id, expires_at, updated_at)
         VALUES ($1, TRUE, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET is_premium = TRUE, product_id = $2, expires_at = $3, updated_at = NOW()`,
        [app_user_id, product_id ?? null, expiresAt]
      );
      console.log(`[webhook] PREMIUM ON  user=${app_user_id} type=${type}`);
    } else if (INACTIVE_EVENTS.has(type)) {
      await pool.query(
        `INSERT INTO user_subscriptions (user_id, is_premium, product_id, expires_at, updated_at)
         VALUES ($1, FALSE, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET is_premium = FALSE, product_id = $2, expires_at = $3, updated_at = NOW()`,
        [app_user_id, product_id ?? null, expiresAt]
      );
      console.log(`[webhook] PREMIUM OFF user=${app_user_id} type=${type}`);
    } else {
      console.log(`[webhook] skipped type=${type} user=${app_user_id}`);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("[webhook] db error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
