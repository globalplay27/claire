import { Router } from "express";
import { env } from "../config/env.js";
import { getAsset, listRecentJobs } from "./repository.js";
import { runAutomationCycle, runAutomationNow } from "./orchestrator.js";

export const automationRouter = Router();

function adminAuthorized(req: any) {
  if (!env.AUTOMATION_ADMIN_TOKEN) return false;
  return req.get("authorization") === `Bearer ${env.AUTOMATION_ADMIN_TOKEN}`;
}

automationRouter.get("/status", async (_req, res) => {
  res.json({
    enabled: env.AUTOMATION_ENABLED,
    agents: ["researcher", "planner", "creator", "publisher", "engagement", "auditor"],
    openaiConfigured: Boolean(env.OPENAI_API_KEY),
    metaSignatureConfigured: Boolean(env.META_APP_SECRET),
    recentJobs: await listRecentJobs(10)
  });
});

automationRouter.post("/run", async (req, res) => {
  if (!adminAuthorized(req)) return void res.sendStatus(401);
  await runAutomationCycle();
  res.json({ ok: true });
});

automationRouter.post("/run-now", async (req, res) => {
  if (!adminAuthorized(req)) return void res.sendStatus(401);
  void runAutomationNow().catch((error) => {
    console.error("Manual run-now failed", error instanceof Error ? error.message : String(error));
  });
  res.status(202).json({ ok: true, started: true });
});

automationRouter.get("/assets/:id", async (req, res) => {
  const asset = await getAsset(req.params.id);
  if (!asset) return void res.sendStatus(404);
  res.setHeader("content-type", asset.mime_type);
  res.setHeader("cache-control", "public, max-age=86400");
  res.send(asset.bytes);
});
