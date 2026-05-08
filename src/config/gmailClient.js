import { google } from "googleapis";
import { env, hasGmailConfig } from "./env.js";

export function getGmailClient() {
  if (!hasGmailConfig()) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    env.gmailClientId,
    env.gmailClientSecret,
    env.gmailRedirectUri
  );

  oauth2Client.setCredentials({ refresh_token: env.gmailRefreshToken });

  return google.gmail({ version: "v1", auth: oauth2Client });
}
