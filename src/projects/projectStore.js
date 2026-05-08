import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeProject } from "./projectSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, "../../data/projects.json");

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function getProjects() {
  const projects = await readJsonFile(dataPath, []);
  return projects.map(normalizeProject);
}

export async function getProjectById(id) {
  const projects = await getProjects();
  return projects.find((project) => project.id === id) || null;
}

export async function saveProjects(projects) {
  await writeJsonFile(dataPath, projects.map(normalizeProject));
}

export async function updateProject(id, patch) {
  const projects = await getProjects();
  const index = projects.findIndex((project) => project.id === id);

  if (index === -1) {
    return null;
  }

  projects[index] = normalizeProject({ ...projects[index], ...patch });
  await saveProjects(projects);
  return projects[index];
}

export async function appendLastUpdate(id, update) {
  const project = await getProjectById(id);
  if (!project) return null;

  const last_updates = [
    {
      sent_at: new Date().toISOString(),
      subject: update.subject,
      body: update.body
    },
    ...project.last_updates
  ].slice(0, 8);

  return updateProject(id, {
    last_updates,
    last_email_sent_at: new Date().toISOString()
  });
}
