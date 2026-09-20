import { autoPostHours, env, getPublicBaseUrl } from "../config/env.js";
import { creatorAgent, imageAgent, plannerAgent } from "./openai-agents.js";
import { publishImagePost } from "./meta-publisher.js";
import {
  createJob,
  getPublishableJobs,
  hasJobForLocalDay,
  markFailed,
  markPublished,
  markPublishing,
  recordRun,
  saveAsset,
  setCreatedContent
} from "./repository.js";

let busy = false;
let timer: NodeJS.Timeout | null = null;

function saoPauloParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { dayKey: `${value("year")}-${value("month")}-${value("day")}`, hour: Number(value("hour")) };
}

function nextSchedule(date = new Date()) {
  const { hour } = saoPauloParts(date);
  const chosen = [...autoPostHours].sort((a,b) => a-b).find((h) => h >= hour) ?? autoPostHours[0] ?? 18;
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit"
  });
  const [y,m,d] = formatter.format(date).split("-").map(Number);
  // São Paulo is UTC-3 in current deployment context; scheduling is kept explicit for this account.
  return new Date(Date.UTC(y!, (m! - 1), d!, chosen + 3, 0, 0));
}

export async function runAutomationCycle() {
  if (!env.AUTOMATION_ENABLED || busy) return;
  busy = true;
  try {
    const baseUrl = getPublicBaseUrl();
    if (!baseUrl) throw new Error("PUBLIC_BASE_URL/RAILWAY_PUBLIC_DOMAIN indisponível");

    const { dayKey, hour } = saoPauloParts();
    if (autoPostHours.includes(hour) && !(await hasJobForLocalDay(dayKey))) {
      const plan = await plannerAgent();
      const job = await createJob({
        agent: "planner",
        topic: plan.topic,
        objective: plan.objective,
        scheduledFor: nextSchedule()
      });
      const content = await creatorAgent(job.topic, job.objective);
      await setCreatedContent(job.id, content.caption, content.imagePrompt);
      const image = await imageAgent(content.imagePrompt);
      const assetId = await saveAsset(job.id, image);
      await recordRun("creator", "success", `job=${job.id}; asset=${assetId}`);
    }

    for (const job of await getPublishableJobs()) {
      try {
        await markPublishing(job.id);
        const asset = await (await import("./repository.js")).getJob(job.id);
        if (!asset) throw new Error("Job não encontrado");
        const raw = await (await import("../database/db.js")).db.query(
          "SELECT asset_id FROM automation_jobs WHERE id=$1",
          [job.id]
        );
        const assetId = raw.rows[0]?.asset_id;
        if (!assetId) throw new Error("Job sem asset");
        const imageUrl = `${baseUrl}/automation/assets/${assetId}`;
        const mediaId = await publishImagePost(imageUrl, job.caption ?? job.topic);
        await markPublished(job.id, mediaId);
        await recordRun("publisher", "success", `job=${job.id}; media=${mediaId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await markFailed(job.id, message);
        await recordRun("publisher", "failed", message);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Automation cycle failed", message);
    await recordRun("planner", "failed", message).catch(() => undefined);
  } finally {
    busy = false;
  }
}

export function startAutomation() {
  if (!env.AUTOMATION_ENABLED || timer) return;
  void runAutomationCycle();
  timer = setInterval(() => void runAutomationCycle(), env.AUTOMATION_POLL_SECONDS * 1000);
  timer.unref();
  console.log(`Instagram automation enabled; polling every ${env.AUTOMATION_POLL_SECONDS}s`);
}
