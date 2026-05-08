import { Router } from "express";
import { generateUpdateEmail } from "../ai/generateUpdateEmail.js";
import { env } from "../config/env.js";
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

export async function sendUpdateForProject(projectId, options = {}) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw Object.assign(new Error("Project not found"), { statusCode: 404 });
  }

  if (env.requireSendConfirmation && options.confirm !== true) {
    throw Object.assign(new Error("Send confirmation is required."), { statusCode: 400 });
  }

  const generated = await generatePreviewForProject(projectId);
  const recipient = options.testRecipient || env.testRecipientEmail || project.client_email;
  const sendResult = await sendEmail({
    to: recipient,
    subject: generated.subject,
    body: generated.body,
    dryRun: options.dryRun === true
  });

  if (!sendResult.dryRun) {
    await appendLastUpdate(project.id, generated);
    await appendGeneratedEmail({
      project_id: project.id,
      client_email: project.client_email,
      recipient_email: recipient,
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
  }

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
    res.json(await sendUpdateForProject(req.params.projectId, {
      confirm: req.body?.confirm === true,
      dryRun: req.body?.dryRun === true,
      testRecipient: req.body?.testRecipient
    }));
  } catch (error) {
    next(error);
  }
});
