require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, app: "naelo-api", ts: Date.now() });
});

const aiRouter = require("./ai");
app.use("/ai", aiRouter);

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
