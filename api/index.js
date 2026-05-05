require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.text({ type: "text/plain", limit: "1mb" }));

// Static HTML pages (privacy, policy, delete-account)
const ASSETS_DIR = process.env.ASSETS_DIR || path.join(__dirname, "../assets");
app.use(express.static(ASSETS_DIR));

// Landing page
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Naelo</title><style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0812;color:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif}.c{text-align:center;gap:12px;display:flex;flex-direction:column}h1{font-size:2rem;font-weight:800}p{color:rgba(255,255,255,0.45);font-size:14px}</style></head><body><div class="c"><h1>✨ Naelo</h1><p>Твій провідник внутрішнього розвитку</p></div></body></html>`);
});

app.get("/health", (req, res) => {
  res.json({ ok: true, app: "naelo-api", ts: Date.now() });
});

const aiRouter = require("./ai");
app.use("/ai", aiRouter);        // прямий доступ: порт 8012/ai/chat
app.use("/api/ai", aiRouter);    // через Caddy: mynaelo.com/api/ai/chat
app.get("/api/health", (req, res) => res.json({ ok: true, app: "naelo-api", ts: Date.now() }));

// Static pages via /api/ prefix (works with current Caddy routing)
app.get("/api/privacy",        (req, res) => res.sendFile(path.join(__dirname, "../assets/privacy.html")));
app.get("/api/policy",         (req, res) => res.sendFile(path.join(__dirname, "../assets/policy.html")));
app.get("/api/delete-account", (req, res) => res.sendFile(path.join(__dirname, "../assets/delete-account.html")));

const dreamsRouter = require("./dreams");
app.use("/dreams", dreamsRouter);
app.use("/api/dreams", dreamsRouter);

const statsRouter = require("./stats");
app.use("/stats", statsRouter);
app.use("/api/stats", statsRouter);

const webhookRouter = require("./webhook");
app.use("/api/webhooks", webhookRouter);

const { calculateScore } = require("./score");
app.get("/user/score/:userId", async (req, res) => {
  try {
    const score = await calculateScore(req.params.userId);
    res.json({ score });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(8012, "0.0.0.0", () => {
  console.log("Naelo API listening on port 8012");
});
