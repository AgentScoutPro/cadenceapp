import { generateUpdateEmail } from "../ai/generateUpdateEmail.js";
import { ingestProjectDocuments } from "../ingestion/documentIngestion.js";
import { ingestGmailMessages } from "../ingestion/gmailIngestion.js";
import { compactForPrompt } from "../ingestion/textCleaner.js";
import { updateProject } from "./projectStore.js";

export async function buildProjectMemory(project) {
  const [emails, documents] = await Promise.all([
    ingestGmailMessages(project),
    ingestProjectDocuments(project)
  ]);

  const emailText = emails
    .map((email) => `Subject: ${email.subject}\nDate: ${email.date}\n${email.text}`)
    .join("\n\n---\n\n");
  const documentText = documents
    .map((document) => `Source: ${document.source}\n${document.text || document.error}`)
    .join("\n\n---\n\n");

  return {
    ...project,
    ingested_sources: {
      emails,
      documents
    },
    raw_context: compactForPrompt(
      [
        `Scope of Work:\n${project.scope_of_work}`,
        `Email Activity:\n${emailText || "No Gmail messages ingested."}`,
        `Documents:\n${documentText || "No documents ingested."}`
      ].join("\n\n")
    )
  };
}

export async function refreshProjectMemory(project) {
  const memory = await buildProjectMemory(project);
  const preview = await generateUpdateEmail(memory, { previewOnly: true });

  return updateProject(project.id, {
    recent_activity_summary: preview.summary,
    open_loops: preview.open_loops,
    risks: preview.risks,
    wins: preview.wins
  });
}
