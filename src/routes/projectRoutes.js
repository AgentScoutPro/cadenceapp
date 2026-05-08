import { Router } from "express";
import { buildProjectMemory, refreshProjectMemory } from "../projects/projectMemory.js";
import { getNextScheduledSend } from "../scheduler/cadenceCron.js";
import { getProjectById, getProjects } from "../projects/projectStore.js";

export const projectRoutes = Router();

projectRoutes.get("/", async (_req, res, next) => {
  try {
    const projects = await getProjects();
    res.json({
      projects,
      next_scheduled_send: getNextScheduledSend()
    });
  } catch (error) {
    next(error);
  }
});

projectRoutes.get("/:id", async (req, res, next) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    return res.json({ project, next_scheduled_send: getNextScheduledSend() });
  } catch (error) {
    return next(error);
  }
});

projectRoutes.post("/:id/ingest", async (req, res, next) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const updatedProject = await refreshProjectMemory(project);
    return res.json({ project: updatedProject });
  } catch (error) {
    return next(error);
  }
});

projectRoutes.post("/:id/memory", async (req, res, next) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    return res.json({ memory: await buildProjectMemory(project) });
  } catch (error) {
    return next(error);
  }
});
