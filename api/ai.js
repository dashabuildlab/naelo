const express = require("express");
const router = express.Router();
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /ai/evaluate — AI score evaluation of check-in answer
// Повертає { delta: number | null }. null = AI не зміг оцінити (помилка/нерозпарсило)
// → клієнт має використати свій local delta замість того, щоб скидати score у 0.
router.post("/evaluate", async (req, res) => {
  const { text, question } = req.body;
  if (!text) return res.status(400).json({ delta: null, error: "no_text" });

  try {
    const prompt = `Питання: ${question || "Як твій день?"}\nВідповідь: ${text}`;
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 50,
      system: `Analyze the emotional tone of this Ukrainian text and return ONLY an integer from -15 to +15. No explanation, just the number. Positive = good/productive, Negative = bad/exhausting, 0 = neutral.`,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = response.content[0].text.trim();
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      // Claude повернув не-число → нехай клієнт використає local delta
      return res.json({ delta: null, error: "parse_fail", raw });
    }
    const delta = Math.max(-15, Math.min(15, parsed));
    res.json({ delta });
  } catch (e) {
    console.error("AI evaluate error:", e.message);
    res.json({ delta: null, error: e.message });
  }
});

// Дружнє повідомлення коли AI тимчасово недоступний.
// Завжди українською, з пропозицією повторити пізніше.
// Без емодзі — витриманий, дорослий стиль провідника.
const FALLBACK_REPLY = "Я зараз ненадовго в тиші. Спробуй ще раз за хвилинку. А поки — зроби три глибоких вдихи, я з тобою.";

// Регекс для видалення емодзі з відповіді AI (safety-net на випадок,
// якщо Claude все одно їх вставить попри system prompt).
// Покриває основні Unicode-діапазони емодзі + variation selectors.
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2700}-\u{27BF}\u{FE0F}\u{200D}\u{1F900}-\u{1F9FF}]/gu;
const stripEmojis = (text) => text.replace(EMOJI_REGEX, "").replace(/  +/g, " ").trim();

// Класифікація помилок Anthropic SDK для логів і клієнта.
function classifyAnthropicError(e) {
  const msg = String(e?.message || "");
  const status = e?.status || e?.response?.status;
  if (status === 401 || /api[_ ]?key|authentication/i.test(msg))  return "auth";
  if (status === 429 || /rate[_ ]?limit|too many/i.test(msg))     return "rate_limit";
  if (status === 529 || status === 503 || /overload|unavail/i.test(msg)) return "overloaded";
  if (status >= 500 && status < 600)                              return "server_error";
  if (/network|fetch|ECONN|ETIMEDOUT|timeout/i.test(msg))         return "network";
  return "unknown";
}

router.post("/chat", async (req, res) => {
  const { message, name, score, goal, energy, context, is_premium } = req.body;

  if (!message) return res.status(400).json({ error: "message required", reply: null });

  const systemPrompt = `Ти — Naelo, теплий AI провідник для внутрішнього розвитку.
Ти спілкуєшся українською мовою. Ти як мудра подруга — підтримуєш, не осуджуєш.
Ти бачиш реальний стан користувача і відповідаєш з урахуванням контексту.

${context ? `=== Контекст користувача ===\n${context}\n===========================` :
`Ім'я: ${name || "друг"}, Вогник душі: ${score || 50}%, Ціль: ${goal || "розвиток"}, Енергія: ${energy || "середня"}`}

ВАЖЛИВО ПРО СТИЛЬ:
- НІКОЛИ не використовуй емодзі та символи юнікод-смайлів (🌙, 💪, 😊, ✨, 💛 тощо). Жодних. Зовсім.
- Витриманий, дорослий, спокійний тон. Без вигуків та надмірної експресії.
- Не вживай дешевих звертань "подруго", "друже мій", "любий". Просто "ти" або імʼя.
- Спілкуйся сенсами і метафорами, а не значками.

Відповідай коротко (2-4 речення), тепло і по суті.
${is_premium ? "Аналізуй патерни в контексті та звертай увагу на повторювані теми." : ""}
Якщо бачиш низький score або стрес — запропонуй конкретну міні-практику словами, без значків.
Ніколи не ставиш медичних діагнозів. Ти — підтримка, не лікар.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: String(message) }],
    });

    const rawReply = response?.content?.[0]?.text;
    if (!rawReply || typeof rawReply !== "string" || !rawReply.trim()) {
      // Anthropic повернув порожнечу → fallback
      return res.json({ reply: FALLBACK_REPLY, fallback: true, reason: "empty_reply" });
    }

    // Safety-net: видалити будь-які емодзі, які Claude міг вставити попри інструкцію
    const reply = stripEmojis(rawReply);
    res.json({ reply });
  } catch (e) {
    const reason = classifyAnthropicError(e);
    console.error(`AI chat error [${reason}]:`, e.message);
    // ⬇️ ВАЖЛИВО: завжди 200 з fallback-повідомленням, ніколи 500.
    // Це дозволяє клієнту показати дружнє повідомлення замість generic-помилки.
    res.json({
      reply: FALLBACK_REPLY,
      fallback: true,
      reason,
    });
  }
});

module.exports = router;
