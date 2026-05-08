import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./src/config/env.js";
import { emailRoutes } from "./src/routes/emailRoutes.js";
import { projectRoutes } from "./src/routes/projectRoutes.js";
import { runCadenceBatch, startCadenceCron } from "./src/scheduler/cadenceCron.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "Cadence by C0D3AI" });
});

app.get("/api/config", (_req, res) => {
  res.json({
    demoMode: env.demoMode,
    authEnabled: Boolean(env.dashboardPassword),
    gmailConfigured: Boolean(env.gmailClientId && env.gmailClientSecret && env.gmailRefreshToken),
    safeSendRequired: env.requireSendConfirmation,
    testRecipientConfigured: Boolean(env.testRecipientEmail)
  });
});

app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/cron/")) {
    next();
    return;
  }

  if (!env.dashboardPassword) {
    next();
    return;
  }

  if (req.headers["x-cadence-demo-password"] === env.dashboardPassword) {
    next();
    return;
  }

  res.status(401).json({ error: "Dashboard password required." });
});

app.use("/api/projects", projectRoutes);
app.use("/api/email", emailRoutes);

app.get("/api/cron/send-updates", async (req, res, next) => {
  try {
    if (env.cronSecret && req.headers.authorization !== `Bearer ${env.cronSecret}`) {
      res.status(401).json({ error: "Invalid cron secret." });
      return;
    }

    const results = await runCadenceBatch({
      confirm: true,
      dryRun: req.query.dryRun === "true"
    });
    res.json({ ok: true, results });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({ error: error.message || "Unexpected server error" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (process.env.VERCEL !== "1") {
  app.listen(env.port, () => {
    console.log(`Cadence by C0D3AI running at http://localhost:${env.port}`);
    startCadenceCron();
  });
}

export default app;
