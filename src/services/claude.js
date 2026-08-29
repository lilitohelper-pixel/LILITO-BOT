const fetch = require("node-fetch");

const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-5";

function buildPrompt(messageText) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

  return `Today's date is ${today} (${weekday}). Extract task info from this message, resolving any relative dates (e.g. "tomorrow", "next Friday", "in two weeks") against today's date. Return ONLY a raw JSON object with no markdown formatting, no code fences, no backticks, and no explanatory text before or after — just the JSON object itself starting with { and ending with }. Fields: task (string), priority (High/Medium/Low), due_date (YYYY-MM-DD or null), project (string or null). Message: ${messageText}`;
}

async function parseTask(messageText) {
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
      messages: [{ role: "user", content: buildPrompt(messageText) }],
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

module.exports = { parseTask };
