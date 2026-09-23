import { autoPostHours, env, getPublicBaseUrl } from "../config/env.js";
import { creatorAgent, imageAgent, plannerAgent } from "./openai-agents.js";
import { publishImagePost } from "./meta-publisher.js";
import { viralResearchAgent } from "./viral-research.js";
import { auditOwnInstagramContent } from "./instagram-insights.js";
import { beginPostTracking, clearPostTracking, reportPostStatus, scheduledPostId } from "./nexus-ledger.js";
import {
  createJob,
  getPublishableJobs,
  getRecentLearningMemory,
  hasJobForLocalSlot,
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

async function createFreshPost(label: string) {
  const baseUrl = getPublicBaseUrl();
  if (!baseUrl) throw new Error("PUBLIC_BASE_URL/RAILWAY_PUBLIC_DOMAIN indisponível");

  let jobId: string | null = null;
  const scheduledFor = new Date();
  beginPostTracking(scheduledPostId(scheduledFor, "globalplay-streaming-manual"), scheduledFor);
  try {
    const learningMemory = await getRecentLearningMemory();
    const [research, audit] = await Promise.all([
      viralResearchAgent(learningMemory),
      auditOwnInstagramContent()
    ]);

    await recordRun("researcher", "success", JSON.stringify({
      source: label,
      summary: research.summary,
      signals: research.signals.slice(0, 4),
      angles: research.angles.slice(0, 4)
    }));
    await recordRun("auditor", audit.available ? "success" : "partial", JSON.stringify({
      source: label,
      sampleSize: audit.sampleSize,
      summary: audit.summary,
      top: audit.topPatterns.slice(0, 3),
      weak: audit.weakPatterns.slice(0, 2)
    }));

    const plan = await plannerAgent(research, audit);
    const job = await createJob({
      agent: "planner",
      topic: plan.topic,
      objective: plan.objective,
      scheduledFor
    });
    jobId = job.id;

    const content = await creatorAgent(job.topic, job.objective, research, audit);
    await setCreatedContent(job.id, content.caption, content.imagePrompt);

    const image = await imageAgent(content.imagePrompt, content.headline, content.subheadline);
    const assetId = await saveAsset(job.id, image);
    reportPostStatus("ready", { approvalStatus: "approved" });
    await recordRun("creator", "success", `job=${job.id}; asset=${assetId}; source=${label}`);

    await markPublishing(job.id);
    reportPostStatus("publishing");
    const imageUrl = `${baseUrl}/automation/assets/${assetId}`;
    const mediaId = await publishImagePost(imageUrl, content.caption);
    await markPublished(job.id, mediaId);
    reportPostStatus("published", { mediaId, publishedAt: new Date().toISOString() });
    await recordRun("publisher", "success", `job=${job.id}; media=${mediaId}; source=${label}`);

    return { jobId: job.id, assetId, mediaId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jobId) await markFailed(jobId, message).catch(() => undefined);
    reportPostStatus("failed", { error: message, approvalStatus: /reprovado|quality/i.test(message) ? "rejected" : "pending" });
    await recordRun("creator", "failed", `source=${label}; ${message}`).catch(() => undefined);
    console.error("Manual creative pipeline failed", message);
    throw error;
  } finally {
    clearPostTracking();
  }
}

export async function runAutomationNow() {
  if (busy) throw new Error("Automação ocupada; tente novamente em instantes");
  busy = true;
  try {
    return await createFreshPost("manual-now");
  } finally {
    clearPostTracking();
    busy = false;
  }
}

export async function runAutomationCycle() {
  if (!env.AUTOMATION_ENABLED || busy) return;
  busy = true;

  try {
    const baseUrl = getPublicBaseUrl();
    if (!baseUrl) throw new Error("PUBLIC_BASE_URL/RAILWAY_PUBLIC_DOMAIN indisponível");

    const { dayKey, hour } = saoPauloParts();
    const slotHour = autoPostHours.find((scheduledHour) => scheduledHour === hour);

    if (slotHour !== undefined && !(await hasJobForLocalSlot(dayKey, slotHour))) {
      let jobId: string | null = null;
      const scheduledFor = new Date();
      const scheduledHour = String(slotHour).padStart(2, "0") + ":00";
      beginPostTracking(scheduledPostId(scheduledFor), scheduledFor, scheduledHour);
      try {
        const learningMemory = await getRecentLearningMemory();
        const [research, audit] = await Promise.all([
          viralResearchAgent(learningMemory),
          auditOwnInstagramContent()
        ]);

        await recordRun("researcher", "success", JSON.stringify({
          summary: research.summary,
          signals: research.signals.slice(0, 4),
          angles: research.angles.slice(0, 4)
        }));
        await recordRun("auditor", audit.available ? "success" : "partial", JSON.stringify({
          sampleSize: audit.sampleSize,
          summary: audit.summary,
          top: audit.topPatterns.slice(0, 3),
          weak: audit.weakPatterns.slice(0, 2)
        }));

        const plan = await plannerAgent(research, audit);
        const job = await createJob({
          agent: "planner",
          topic: plan.topic,
          objective: plan.objective,
          scheduledFor
        });
        jobId = job.id;

        const content = await creatorAgent(job.topic, job.objective, research, audit);
        await setCreatedContent(job.id, content.caption, content.imagePrompt);

        const image = await imageAgent(content.imagePrompt, content.headline, content.subheadline);
        const assetId = await saveAsset(job.id, image);
        reportPostStatus("ready", { approvalStatus: "approved" });
        await recordRun("creator", "success", `job=${job.id}; asset=${assetId}; slot=${slotHour}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (jobId) await markFailed(jobId, message).catch(() => undefined);
        reportPostStatus("failed", { error: message, approvalStatus: /reprovado|quality/i.test(message) ? "rejected" : "pending" });
        await recordRun("creator", "failed", message).catch(() => undefined);
        console.error("Creative pipeline failed", message);
      }
    }

    for (const job of await getPublishableJobs()) {
      const trackedFor = job.scheduledFor || new Date();
      const trackedHour = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false
      }).format(trackedFor) + ":00";
      beginPostTracking(scheduledPostId(trackedFor), trackedFor, trackedHour);
      try {
        await markPublishing(job.id);
        reportPostStatus("publishing");
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
        reportPostStatus("published", { mediaId, publishedAt: new Date().toISOString() });
        await recordRun("publisher", "success", `job=${job.id}; media=${mediaId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await markFailed(job.id, message);
        reportPostStatus("failed", { error: message });
        await recordRun("publisher", "failed", message);
      } finally {
        clearPostTracking();
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
  if (env.MANUAL_POST_ON_START) {
    void runAutomationNow()
      .then((result) => console.log(`MANUAL_POST_ON_START_SUCCESS media=${result.mediaId}`))
      .catch((error) => console.error("MANUAL_POST_ON_START_FAILED", error instanceof Error ? error.message : String(error)));
  }

  if (!env.AUTOMATION_ENABLED || timer) return;
  void runAutomationCycle();
  timer = setInterval(() => void runAutomationCycle(), env.AUTOMATION_POLL_SECONDS * 1000);
  timer.unref();
  console.log(`Instagram automation enabled; polling every ${env.AUTOMATION_POLL_SECONDS}s; post hours=${autoPostHours.join(",")}`);
}
