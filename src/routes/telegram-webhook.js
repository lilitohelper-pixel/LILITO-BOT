const express = require("express");
const telegram = require("../services/telegram");
const whisper = require("../services/whisper");
const claude = require("../services/claude");
const notion = require("../services/notion");

const router = express.Router();

router.post("/webhook/telegram", (req, res) => {
  // Ack immediately so Telegram doesn't retry; do the real work after responding.
  res.sendStatus(200);
  handleUpdate(req.body).catch((err) => {
    console.error("[telegram-webhook] unhandled error:", err);
  });
});

async function handleUpdate(body) {
  const message = body && body.message;
  if (!message) return;

  const chatId = message.chat && message.chat.id;

  try {
    let text;

    if (message.text && message.text.startsWith("/")) {
      // Slash command like /start — ignore for now.
      return;
    } else if (message.text) {
      text = message.text;
    } else if (message.voice) {
      text = await transcribeVoice(message.voice.file_id);
    } else {
      // Photo, sticker, /start, etc. — ignore for now.
      return;
    }

    const senderFirstName = message.from && message.from.first_name;
    const parsedTask = await parseTaskSafely(text, chatId);
    if (!parsedTask) return;

    await notion.createTaskPage(parsedTask, senderFirstName);
    await telegram.sendMessage(
      chatId,
      `✅ Added: "${parsedTask.task}" (due ${parsedTask.due_date || "no date"})`
    );
  } catch (err) {
    console.error("[telegram-webhook] processing failed:", err);
    if (chatId) {
      await telegram
        .sendMessage(chatId, "⚠️ Something went wrong processing that, please try again")
        .catch((sendErr) => console.error("[telegram-webhook] failed to notify user:", sendErr));
    }
  }
}

async function transcribeVoice(fileId) {
  const filePath = await telegram.getFile(fileId);
  const audioBuffer = await telegram.downloadFile(filePath);
  return whisper.transcribe(audioBuffer);
}

async function parseTaskSafely(text, chatId) {
  let rawResult;
  try {
    rawResult = await claude.parseTask(text);
  } catch (err) {
    console.error("[telegram-webhook] Claude parsing failed:", err);
    if (chatId) {
      await telegram
        .sendMessage(chatId, "⚠️ Something went wrong processing that, please try again")
        .catch((sendErr) => console.error("[telegram-webhook] failed to notify user:", sendErr));
    }
    return null;
  }
  return rawResult;
}

module.exports = router;
