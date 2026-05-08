import { getGmailClient } from "../config/gmailClient.js";
import { cleanText } from "./textCleaner.js";

function decodeBase64Url(value = "") {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function findBodyParts(payload) {
  if (!payload) return [];
  const parts = payload.parts || [];
  if (payload.body?.data && payload.mimeType === "text/plain") {
    return [payload.body.data];
  }

  return parts.flatMap(findBodyParts);
}

function extractMessageText(message) {
  const bodyParts = findBodyParts(message.payload);
  if (bodyParts.length > 0) {
    return cleanText(bodyParts.map(decodeBase64Url).join("\n\n"));
  }

  if (message.payload?.body?.data) {
    return cleanText(decodeBase64Url(message.payload.body.data));
  }

  return cleanText(message.snippet || "");
}

export async function ingestGmailMessages(project, maxResults = 15) {
  const gmail = getGmailClient();
  if (!gmail || !project.gmail_thread_query) {
    return [];
  }

  const list = await gmail.users.messages.list({
    userId: "me",
    q: project.gmail_thread_query,
    maxResults
  });

  const messages = list.data.messages || [];
  const hydrated = [];

  for (const message of messages) {
    const result = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "full"
    });

    const headers = result.data.payload?.headers || [];
    const subject = headers.find((header) => header.name.toLowerCase() === "subject")?.value || "";
    const date = headers.find((header) => header.name.toLowerCase() === "date")?.value || "";

    hydrated.push({
      id: result.data.id,
      threadId: result.data.threadId,
      subject,
      date,
      text: extractMessageText(result.data)
    });
  }

  return hydrated;
}
