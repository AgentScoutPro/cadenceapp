import dotenv from "dotenv";

dotenv.config();

const optional = (key, fallback = "") => process.env[key] || fallback;

export const env = {
  port: Number(optional("PORT", "3000")),
  cronEnabled: optional("CRON_ENABLED", "false") === "true",
  openaiApiKey: optional("OPENAI_API_KEY"),
  openaiModel: optional("OPENAI_MODEL", "gpt-4o-mini"),
  gmailClientId: optional("GMAIL_CLIENT_ID"),
  gmailClientSecret: optional("GMAIL_CLIENT_SECRET"),
  gmailRedirectUri: optional("GMAIL_REDIRECT_URI", "https://developers.google.com/oauthplayground"),
  gmailRefreshToken: optional("GMAIL_REFRESH_TOKEN"),
  gmailSenderEmail: optional("GMAIL_SENDER_EMAIL")
};

export function hasOpenAIConfig() {
  return Boolean(env.openaiApiKey && !env.openaiApiKey.includes("your-openai"));
}

export function hasGmailConfig() {
  return Boolean(
    env.gmailClientId &&
      env.gmailClientSecret &&
      env.gmailRefreshToken &&
      env.gmailSenderEmail
  );
}
