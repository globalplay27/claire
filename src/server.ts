import express from "express";
import { env } from "./config/env.js";
import { db } from "./database/db.js";
import { instagramRouter } from "./instagram/router.js";
import { automationRouter } from "./automation/router.js";
import { startAutomation } from "./automation/orchestrator.js";
import { odinRouter } from "./odin/router.js";

const app = express();

app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    (req as express.Request).rawBody = Buffer.from(buf);
  }
}));

app.get("/nexus/leads", async (req, res) => {
  const expected = String(env.NEXUS_AGENT_TOKEN || "");
  const auth = String(req.headers.authorization || "");
  if (!expected || auth !== "Bearer " + expected) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const result = await db.query(
      `SELECT instagram_user_id, instagram_username, temperature, score, stage, intent,
              needs_human, trigger_keyword, last_contact_at, updated_at
       FROM leads
       ORDER BY needs_human DESC, score DESC, updated_at DESC
       LIMIT 500`
    );
    const leads = result.rows.map((row: any) => ({
      instagramUserId: String(row.instagram_user_id || ""),
      instagramUsername: row.instagram_username ? String(row.instagram_username) : "",
      temperature: String(row.temperature || "cold"),
      score: Number(row.score || 0),
      stage: String(row.stage || "new"),
      intent: row.intent ? String(row.intent) : "",
      needsHuman: Boolean(row.needs_human),
      triggerKeyword: row.trigger_keyword ? String(row.trigger_keyword) : "",
      lastContactAt: row.last_contact_at || null,
      updatedAt: row.updated_at || null
    }));
    const summary = leads.reduce((acc: any, lead: any) => {
      acc.total += 1;
      if (lead.temperature === "hot") acc.hot += 1;
      else if (lead.temperature === "warm") acc.warm += 1;
      else acc.cold += 1;
      if (lead.needsHuman) acc.needsHuman += 1;
      return acc;
    }, { total: 0, hot: 0, warm: 0, cold: 0, needsHuman: 0 });
    res.json({ ok: true, summary, leads });
  } catch (error) {
    console.error("NEXUS leads endpoint failed", error);
    res.status(500).json({ error: "leads_unavailable" });
  }
});

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
app.use("/odin", odinRouter);

app.listen(env.PORT, () => {
  console.log(`Claire Instagram Agent listening on port ${env.PORT}`);
  startAutomation();
});
