import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";
import pdf from "pdf-parse";
import { cleanText } from "./textCleaner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

export async function parseDocument(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(rootDir, filePath);
  const ext = path.extname(absolutePath).toLowerCase();

  if (ext === ".txt" || ext === ".md") {
    return cleanText(await fs.readFile(absolutePath, "utf8"));
  }

  if (ext === ".pdf") {
    const buffer = await fs.readFile(absolutePath);
    const result = await pdf(buffer);
    return cleanText(result.text);
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: absolutePath });
    return cleanText(result.value);
  }

  throw new Error(`Unsupported document type: ${ext || "unknown"}`);
}

export async function ingestProjectDocuments(project) {
  const documents = [];

  for (const filePath of project.local_document_paths || []) {
    try {
      documents.push({
        source: filePath,
        text: await parseDocument(filePath)
      });
    } catch (error) {
      documents.push({
        source: filePath,
        error: error.message,
        text: ""
      });
    }
  }

  return documents;
}
