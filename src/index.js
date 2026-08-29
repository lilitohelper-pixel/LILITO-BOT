require("dotenv").config();
const express = require("express");
const telegramWebhook = require("./routes/telegram-webhook");
const telegram = require("./services/telegram");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Telegram task bot is running");
});

app.use(telegramWebhook);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  if (process.env.BASE_URL && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      await telegram.setWebhook(`${process.env.BASE_URL}/webhook/telegram`);
      console.log("Telegram webhook registered.");
    } catch (err) {
      console.error("Failed to register Telegram webhook on startup:", err.message);
    }
  } else {
    console.log("BASE_URL or TELEGRAM_BOT_TOKEN not set — skipping webhook registration (fine for local dev).");
  }
});
