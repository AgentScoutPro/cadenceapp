import { env } from "../config/env.js";
import { getGmailClient } from "../config/gmailClient.js";

function encodeMessage(message) {
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendEmail({ to, subject, body }) {
  const gmail = getGmailClient();
  if (!gmail) {
    return {
      dryRun: true,
      id: `dry-run-${Date.now()}`,
      message: "Gmail is not configured. Email was generated but not sent."
    };
  }

  const rawMessage = [
    `From: ${env.gmailSenderEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body
  ].join("\n");

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeMessage(rawMessage)
    }
  });

  return result.data;
}
