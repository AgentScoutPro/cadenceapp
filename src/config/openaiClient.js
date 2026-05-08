import OpenAI from "openai";
import { env, hasOpenAIConfig } from "./env.js";

export function getOpenAIClient() {
  if (!hasOpenAIConfig()) {
    return null;
  }

  return new OpenAI({ apiKey: env.openaiApiKey });
}
