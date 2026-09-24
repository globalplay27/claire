import express from "express";
import { env } from "./config/env.js";
import { db } from "./database/db.js";
import { instagramRouter } from "./instagram/router.js";
import { automationRouter } from "./automation/router.js";
import { startAutomation } from "./automation/orchestrator.js";
import { odinRouter } from "./odin/router.js";
import { getInstagramInsightSnapshot } from "./automation/instagram-insights.js";

const app = express();

function nexusAuthorized(req: express.Request) {
  const expected = String(env.NEXUS_AGENT_TOKEN || "");
  const auth = String(req.headers.authorization || "");
  return Boolean(expected && auth === "Bearer " + expected);
}

async function openAIJson(pathname: string, payload: unknown, timeoutMs = 180000) {
  if (!env.OPENAI_API_KEY) throw new Error("openai_not_configured");
  const response = await fetch("https://api.openai.com/v1/" + pathname.replace(/^\/+/, ""), {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.OPENAI_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "Claire-NEXUS-Bridge/1.0"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error("openai_http_" + response.status + ":" + JSON.stringify(data).slice(0, 900));
  }
  return data;
}

app.post("/nexus/openai/responses", express.json({ limit: "512kb" }), async (req, res) => {
  if (!nexusAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    const allowed: Record<string, unknown> = {
      model: env.OPENAI_MODEL || "gpt-5.6-luna",
      input: body.input ?? "",
      max_output_tokens: Math.min(6000, Math.max(64, Number(body.max_output_tokens || 1200)))
    };
    if (body.instructions) allowed.instructions = String(body.instructions).slice(0, 16000);
    if (Array.isArray(body.tools)) allowed.tools = body.tools.slice(0, 8);
    if (body.text && typeof body.text === "object") allowed.text = body.text;
    const result = await openAIJson("responses", allowed, 180000);
    res.json(result);
  } catch (error) {
    console.error("NEXUS OpenAI responses bridge failed", error);
    res.status(502).json({
      error: "openai_bridge_failed",
      detail: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500)
    });
  }
});

app.post("/nexus/openai/transcriptions", express.json({ limit: "38mb" }), async (req, res) => {
  if (!nexusAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    if (!env.OPENAI_API_KEY) throw new Error("openai_not_configured");
    const encoded = String(req.body?.audio_base64 || "");
    if (!encoded) {
      res.status(400).json({ error: "audio_required" });
      return;
    }
    const audio = Buffer.from(encoded, "base64");
    if (!audio.length || audio.length > 25 * 1024 * 1024) {
      res.status(413).json({ error: "audio_too_large" });
      return;
    }

    const form = new FormData();
    form.append("file", new Blob([audio], { type: "audio/mpeg" }), String(req.body?.filename || "audio.mp3").slice(0, 120));
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        authorization: "Bearer " + env.OPENAI_API_KEY,
        "user-agent": "Claire-NEXUS-Bridge/1.0"
      },
      body: form,
      signal: AbortSignal.timeout(10 * 60 * 1000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error("openai_transcription_http_" + response.status + ":" + JSON.stringify(data).slice(0, 900));
    }
    res.json(data);
  } catch (error) {
    console.error("NEXUS OpenAI transcription bridge failed", error);
    res.status(502).json({
      error: "openai_bridge_failed",
      detail: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500)
    });
  }
});

app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    (req as express.Request).rawBody = Buffer.from(buf);
  }
}));

app.get("/nexus/instagram/insights", async (req, res) => {
  const expected = String(env.NEXUS_AGENT_TOKEN || "");
  const auth = String(req.headers.authorization || "");
  if (!expected || auth !== "Bearer " + expected) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const snapshot = await getInstagramInsightSnapshot(25);
    res.json(snapshot);
  } catch (error) {
    console.error("NEXUS Instagram insights endpoint failed", error);
    res.status(502).json({
      error: "instagram_insights_unavailable",
      detail: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300)
    });
  }
});

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
