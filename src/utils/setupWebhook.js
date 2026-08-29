require("dotenv").config();
const telegram = require("../services/telegram");

async function main() {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    console.error("BASE_URL is not set in .env");
    process.exit(1);
  }

  const webhookUrl = `${baseUrl}/webhook/telegram`;
  const result = await telegram.setWebhook(webhookUrl);
  console.log(`Webhook registered at ${webhookUrl}`);
  console.log(result);
}

main().catch((err) => {
  console.error("Failed to set webhook:", err);
  process.exit(1);
});
