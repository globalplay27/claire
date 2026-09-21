import express from "express";
import { env } from "./config/env.js";
import { db } from "./database/db.js";
import { instagramRouter } from "./instagram/router.js";
import { automationRouter } from "./automation/router.js";
import { startAutomation } from "./automation/orchestrator.js";

const app = express();

app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    (req as express.Request).rawBody = Buffer.from(buf);
  }
}));

app.get("/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({
      ok: true,
      service: "claire-instagram-agent",
      automationEnabled: env.AUTOMATION_ENABLED,
      openaiConfigured: Boolean(env.OPENAI_API_KEY),
      instagramSignatureConfigured: Boolean(env.INSTAGRAM_APP_SECRET || env.META_APP_SECRET)
    });
  } catch {
    res.status(503).json({ ok: false, service: "claire-instagram-agent" });
  }
});

app.use("/instagram", instagramRouter);
app.use("/automation", automationRouter);

app.listen(env.PORT, () => {
  console.log(`Claire Instagram Agent listening on port ${env.PORT}`);
  startAutomation();
});
