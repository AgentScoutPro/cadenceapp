import { env } from "../config/env.js";
import { getOpenAIClient } from "../config/openaiClient.js";

function fallbackEmail(projectData) {
  const projectName = projectData.project_name || "Project";
  const openLoop = projectData.open_loops?.[0] || "final confirmation on the next priority";
  const win = projectData.wins?.[0] || "the project continues to move forward against the current plan";

  return {
    subject: `[Cadence Update] ${projectName} - Status + Next Steps`,
    body: `Hi ${projectData.client_name || "there"},\n\nQuick update on ${projectName}. Recent activity shows steady movement across the current scope, with the clearest progress around ${win}.\n\nThe project is in an active working state. The main focus right now is keeping the remaining deliverables organized, confirming dependencies, and making sure the next milestone has what it needs before work advances further.\n\nThe only open item to keep an eye on is ${openLoop}. Once that is resolved, the next step is to continue through the current milestone and prepare the next round of review items.\n\nI will keep the update cadence consistent and call out anything that needs a decision before it slows the timeline.\n\nBest,\nC0D3AI`,
    progress: [win],
    blockers: projectData.risks || [],
    next_steps: projectData.open_loops || [],
    open_loops: projectData.open_loops || [],
    risks: projectData.risks || [],
    wins: projectData.wins || [],
    summary: projectData.recent_activity_summary || "Project activity reviewed using available scope, documents, and prior updates."
  };
}

function safeJsonParse(text) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

export async function generateUpdateEmail(projectData) {
  const client = getOpenAIClient();
  if (!client) {
    return fallbackEmail(projectData);
  }

  const priorUpdates = (projectData.last_updates || [])
    .map((update) => `Subject: ${update.subject}\n${update.body}`)
    .join("\n\n---\n\n");

  const response = await client.chat.completions.create({
    model: env.openaiModel,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate concise client project update emails. Return valid JSON only. Avoid repeating phrasing from prior updates."
      },
      {
        role: "user",
        content: `
Create a project update email for Cadence by C0D3AI.

Rules:
- 150-300 words.
- Professional, human, direct tone.
- No fluff.
- Do not repeat phrasing from past updates.
- Always include forward momentum.
- Structure the body as opening, progress summary, current status, needs/decisions, next steps, closing.
- Subject must be: [Cadence Update] ${projectData.project_name} - Status + Next Steps

Return JSON with:
{
  "subject": string,
  "body": string,
  "progress": string[],
  "blockers": string[],
  "next_steps": string[],
  "open_loops": string[],
  "risks": string[],
  "wins": string[],
  "summary": string
}

Project:
${JSON.stringify(projectData, null, 2)}

Prior updates to avoid repeating:
${priorUpdates || "No prior updates."}
`
      }
    ]
  });

  return safeJsonParse(response.choices[0].message.content);
}
