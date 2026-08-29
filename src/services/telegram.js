const fetch = require("node-fetch");

const TELEGRAM_API = "https://api.telegram.org";
const TELEGRAM_FILE_API = "https://api.telegram.org/file";

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return token;
}

async function sendMessage(chatId, text) {
  const url = `${TELEGRAM_API}/bot${botToken()}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function getFile(fileId) {
  const url = `${TELEGRAM_API}/bot${botToken()}/getFile?file_id=${encodeURIComponent(fileId)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram getFile failed: ${JSON.stringify(data)}`);
  }
  return data.result.file_path;
}

async function downloadFile(filePath) {
  const url = `${TELEGRAM_FILE_API}/bot${botToken()}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Telegram file download failed: ${res.status} ${res.statusText}`);
  }
  return res.buffer();
}

async function setWebhook(webhookUrl) {
  const url = `${TELEGRAM_API}/bot${botToken()}/setWebhook`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram setWebhook failed: ${JSON.stringify(data)}`);
  }
  return data;
}

module.exports = { sendMessage, getFile, downloadFile, setWebhook };
