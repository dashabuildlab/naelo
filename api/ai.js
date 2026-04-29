const express = require("express");
const router = express.Router();
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post("/chat", async (req, res) => {
  const { message, name, score, goal, energy, context, streak, momentum, practices_today } = req.body;

  const systemPrompt = `Ти — Naelo, теплий AI провідник для внутрішнього розвитку.
Ти спілкуєшся українською мовою. Ти як мудра подруга — підтримуєш, не осуджуєш.
Ти бачиш реальний стан користувача і відповідаєш з урахуванням контексту.

${context ? `=== Контекст користувача ===\n${context}\n===========================` :
`Ім'я: ${name || "друг"}, Вогник душі: ${score || 50}%, Ціль: ${goal || "розвиток"}, Енергія: ${energy || "середня"}`}

Відповідай коротко (2-4 речення), тепло і по суті.
Якщо бачиш низький score або стрес — запропонуй конкретну міні-практику.
Ніколи не ставиш медичних діагнозів. Ти — підтримка, не лікар.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    res.json({ reply: response.content[0].text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
