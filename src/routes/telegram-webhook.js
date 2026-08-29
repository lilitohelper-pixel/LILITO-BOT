const express = require("express");
const telegram = require("../services/telegram");
const whisper = require("../services/whisper");
const claude = require("../services/claude");
const notion = require("../services/notion");

const router = express.Router();

const ALLOWED_USER_IDS = (process.env.ALLOWED_TELEGRAM_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

function isAuthorized(userId) {
  // No allowlist configured — allow everyone (backward compatible default).
  if (ALLOWED_USER_IDS.length === 0) return true;
  return ALLOWED_USER_IDS.includes(String(userId));
}

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
  const senderId = message.from && message.from.id;

  if (!isAuthorized(senderId)) {
    if (chatId) {
      await telegram
        .sendMessage(chatId, "🚫 You're not authorized to use this bot.")
        .catch((sendErr) => console.error("[telegram-webhook] failed to notify unauthorized user:", sendErr));
    }
    return;
  }

  try {
    let parsedTask;

    if (message.text && message.text.startsWith("/")) {
      // Slash command like /start — ignore for now.
      return;
    } else if (message.text) {
      parsedTask = await parseSafely(() => claude.parseTask(message.text), chatId);
    } else if (message.voice) {
      const text = await transcribeVoice(message.voice.file_id);
      parsedTask = await parseSafely(() => claude.parseTask(text), chatId);
    } else if (message.photo) {
      const { base64, mediaType } = await downloadPhoto(message.photo);
      parsedTask = await parseSafely(
        () => claude.parseTaskFromImage(base64, mediaType, message.caption),
        chatId
      );
    } else {
      // Sticker, /start, etc. — ignore for now.
      return;
    }

    if (!parsedTask) return;

    const senderFirstName = message.from && message.from.first_name;
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

async function downloadPhoto(photoSizes) {
  // Telegram sends multiple resolutions; the last one is the largest.
  const largest = photoSizes[photoSizes.length - 1];
  const filePath = await telegram.getFile(largest.file_id);
  const buffer = await telegram.downloadFile(filePath);
  return { base64: buffer.toString("base64"), mediaType: "image/jpeg" };
}

async function parseSafely(taskFn, chatId) {
  try {
    return await taskFn();
  } catch (err) {
    console.error("[telegram-webhook] Claude parsing failed:", err);
    if (chatId) {
      await telegram
        .sendMessage(chatId, "⚠️ Something went wrong processing that, please try again")
        .catch((sendErr) => console.error("[telegram-webhook] failed to notify user:", sendErr));
    }
    return null;
  }
}

module.exports = router;
