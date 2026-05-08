import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./src/config/env.js";
import { emailRoutes } from "./src/routes/emailRoutes.js";
import { projectRoutes } from "./src/routes/projectRoutes.js";
import { startCadenceCron } from "./src/scheduler/cadenceCron.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "Cadence by C0D3AI" });
});

app.use("/api/projects", projectRoutes);
app.use("/api/email", emailRoutes);

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
