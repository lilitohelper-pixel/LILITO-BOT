const { Client } = require("@notionhq/client");

let notion;
function getClient() {
  if (!notion) {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) throw new Error("NOTION_API_KEY is not set");
    notion = new Client({ auth: apiKey });
  }
  return notion;
}

async function createTaskPage(parsedTask, senderFirstName) {
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) throw new Error("NOTION_DATABASE_ID is not set");

  const personResponsible = parsedTask.person_responsible || senderFirstName || "";

  return getClient().pages.create({
    parent: { database_id: databaseId },
    properties: {
      Task: { title: [{ text: { content: parsedTask.task } }] },
      "Person Responsible": { rich_text: [{ text: { content: personResponsible } }] },
      "Due date": parsedTask.due_date
        ? { date: { start: parsedTask.due_date } }
        : { date: null },
      "Date of assignment": { date: { start: new Date().toISOString() } },
      Owner: { rich_text: [{ text: { content: senderFirstName || "" } }] },
    },
  });
}

module.exports = { createTaskPage };
