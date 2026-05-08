import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const historyPath = path.resolve(__dirname, "../../data/generated-emails.json");

async function readHistory() {
  try {
    const raw = await fs.readFile(historyPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function appendGeneratedEmail(record) {
  const history = await readHistory();
  history.unshift({
    id: `email-${Date.now()}`,
    created_at: new Date().toISOString(),
    ...record
  });
  await fs.writeFile(historyPath, `${JSON.stringify(history.slice(0, 100), null, 2)}\n`);
}
