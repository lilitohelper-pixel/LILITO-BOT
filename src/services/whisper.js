const fetch = require("node-fetch");
const FormData = require("form-data");

const WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";

async function transcribe(audioBuffer) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const form = new FormData();
  form.append("file", audioBuffer, { filename: "voice.ogg" });
  form.append("model", "whisper-1");

  const res = await fetch(WHISPER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Whisper transcription failed: ${JSON.stringify(data)}`);
  }
  return data.text;
}

module.exports = { transcribe };
