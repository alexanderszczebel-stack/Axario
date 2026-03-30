const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// --- rate limiter (in-memory, per IP) ---
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minut
const RATE_LIMIT_MAX = 10;
const rateLimitStore = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

app.use(express.json());

// pliki statyczne z głównego folderu projektu
app.use(express.static(__dirname));

// strona główna
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// endpoint chatbota
app.post("/api/chat", async (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress;

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Zbyt wiele zapytań. Spróbuj ponownie za chwilę." });
  }

  const { message } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Wiadomość nie może być pusta." });
  }

  if (message.length > 500) {
    return res.status(400).json({ error: "Wiadomość jest za długa (max 500 znaków)." });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Jesteś pomocnym asystentem firmy Axario. Odpowiadaj jasno, krótko i profesjonalnie po polsku."
        },
        {
          role: "user",
          content: message.trim()
        }
      ],
      temperature: 0.7,
    });

    const reply = response.choices?.[0]?.message?.content || "Brak odpowiedzi.";

    res.json({ reply });
  } catch (error) {
    console.error("Błąd /api/chat:", error.response?.data || error.message || error);

    res.status(500).json({ error: "Wystąpił błąd. Spróbuj ponownie później." });
  }
});

app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});