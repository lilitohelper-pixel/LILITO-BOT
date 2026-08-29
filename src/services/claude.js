const fetch = require("node-fetch");

const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-5";

const RESPONSE_FORMAT_INSTRUCTIONS =
  'Return ONLY a raw JSON object with no markdown formatting, no code fences, no backticks, and no explanatory text before or after — just the JSON object itself starting with { and ending with }. Fields: task (string), priority (High/Medium/Low), due_date (YYYY-MM-DD or null), person_responsible (string or null — the name of the person who should do this task, only if a specific person other than the sender is mentioned in the message, e.g. "tell John to..." or "ask Sara to..."; otherwise null).';

function todayContext() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  return `Today's date is ${today} (${weekday}).`;
}

function buildTextPrompt(messageText) {
  return `${todayContext()} Extract task info from this message, resolving any relative dates (e.g. "tomorrow", "next Friday", "in two weeks") against today's date. ${RESPONSE_FORMAT_INSTRUCTIONS} Message: ${messageText}`;
}

function buildImagePrompt(captionText) {
  const captionPart = captionText
    ? ` The user also included this caption, which may add context: "${captionText}".`
    : "";
  return `${todayContext()} This image may be a photo of a handwritten note, whiteboard, receipt, screenshot, or similar. Read whatever text or task appears in the image and extract task info from it, resolving any relative dates against today's date.${captionPart} ${RESPONSE_FORMAT_INSTRUCTIONS}`;
}

async function callClaude(content) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const res = await fetch(CLAUDE_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Claude request failed: ${JSON.stringify(data)}`);
  }

  const textBlock = data.content.find((block) => block.type === "text");
  const rawText = textBlock && textBlock.text;
  try {
    return JSON.parse(rawText);
  } catch (err) {
    console.error("[claude] failed to parse JSON response, raw text:", rawText);
    throw err;
  }
}

async function parseTask(messageText) {
  return callClaude(buildTextPrompt(messageText));
}

async function parseTaskFromImage(base64Image, mediaType, captionText) {
  return callClaude([
    {
      type: "image",
      source: { type: "base64", media_type: mediaType, data: base64Image },
    },
    { type: "text", text: buildImagePrompt(captionText) },
  ]);
}

module.exports = { parseTask, parseTaskFromImage };
