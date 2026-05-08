import cron from "node-cron";
import { env } from "../config/env.js";
import { sendUpdateForProject } from "../routes/emailRoutes.js";
import { getProjects } from "../projects/projectStore.js";

export function getNextScheduledSend(now = new Date()) {
  const candidates = [];
  const base = new Date(now);

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const date = new Date(base);
    date.setDate(base.getDate() + dayOffset);

    if (date.getDay() === 1) {
      candidates.push(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0));
    }

    if (date.getDay() === 4) {
      candidates.push(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 14, 0, 0));
    }
  }

  return candidates
    .filter((candidate) => candidate > now)
    .sort((a, b) => a.getTime() - b.getTime())[0]
    .toISOString();
}

async function runCadenceBatch() {
  const projects = (await getProjects()).filter((project) => project.active);

  for (const project of projects) {
    try {
      await sendUpdateForProject(project.id);
      console.log(`Sent Cadence update for ${project.project_name}`);
    } catch (error) {
      console.error(`Failed Cadence update for ${project.project_name}:`, error.message);
    }
  }
}

export function startCadenceCron() {
  if (!env.cronEnabled) {
    console.log("Cadence cron disabled. Set CRON_ENABLED=true to enable scheduled sends.");
    return;
  }

  cron.schedule("0 9 * * 1", runCadenceBatch);
  cron.schedule("0 14 * * 4", runCadenceBatch);
  console.log("Cadence cron enabled for Monday 9:00 AM and Thursday 2:00 PM.");
}
