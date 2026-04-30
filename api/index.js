require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json());

// Static HTML pages (privacy, policy, delete-account)
app.use(express.static(path.join(__dirname, "../assets")));

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
