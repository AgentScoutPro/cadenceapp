import { Router } from "express";
import { generateUpdateEmail } from "../ai/generateUpdateEmail.js";
import { appendGeneratedEmail } from "../email/emailHistoryStore.js";
import { sendEmail } from "../email/sendEmail.js";
import { buildProjectMemory } from "../projects/projectMemory.js";
import { appendLastUpdate, getProjectById, updateProject } from "../projects/projectStore.js";

export const emailRoutes = Router();

export async function generatePreviewForProject(projectId) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw Object.assign(new Error("Project not found"), { statusCode: 404 });
  }

  const memory = await buildProjectMemory(project);
  return generateUpdateEmail(memory);
}

export async function sendUpdateForProject(projectId) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw Object.assign(new Error("Project not found"), { statusCode: 404 });
  }

  const generated = await generatePreviewForProject(projectId);
  const sendResult = await sendEmail({
    to: project.client_email,
    subject: generated.subject,
    body: generated.body
  });

  await appendLastUpdate(project.id, generated);
  await appendGeneratedEmail({
    project_id: project.id,
    client_email: project.client_email,
    subject: generated.subject,
    body: generated.body,
    send_result: sendResult
  });
  await updateProject(project.id, {
    recent_activity_summary: generated.summary,
    open_loops: generated.open_loops,
    risks: generated.risks,
    wins: generated.wins
  });

  return { generated, sendResult };
}

emailRoutes.post("/:projectId/generate-preview", async (req, res, next) => {
  try {
    res.json({ generated: await generatePreviewForProject(req.params.projectId) });
  } catch (error) {
    next(error);
  }
});

emailRoutes.post("/:projectId/send-now", async (req, res, next) => {
  try {
    res.json(await sendUpdateForProject(req.params.projectId));
  } catch (error) {
    next(error);
  }
});
