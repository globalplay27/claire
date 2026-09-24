import { randomUUID } from "node:crypto";
import { db } from "../database/db.js";
import type { AutomationAgent, ContentJob } from "./types.js";

function rowToJob(row: any): ContentJob {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    topic: row.topic,
    objective: row.objective,
    caption: row.caption,
    imagePrompt: row.image_prompt,
    imageMimeType: row.image_mime_type ?? null,
    scheduledFor: row.scheduled_for ? new Date(row.scheduled_for) : null,
    publishedMediaId: row.published_media_id,
    error: row.error
  };
}

export async function createJob(input: {
  agent: AutomationAgent;
  topic: string;
  objective: string;
  scheduledFor: Date;
}) {
  const id = randomUUID();
  const result = await db.query(
    `INSERT INTO automation_jobs(id, agent, topic, objective, scheduled_for)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [id, input.agent, input.topic, input.objective, input.scheduledFor]
  );
  return rowToJob(result.rows[0]);
}

export async function setCreatedContent(id: string, caption: string, imagePrompt: string) {
  await db.query(
    `UPDATE automation_jobs
     SET caption=$2, image_prompt=$3, status='ready', error=NULL, updated_at=NOW()
     WHERE id=$1`,
    [id, caption, imagePrompt]
  );
}

export async function saveAsset(jobId: string, bytes: Buffer, mimeType = "image/jpeg") {
  const assetId = randomUUID();
  await db.query(
    `INSERT INTO content_assets(id, mime_type, bytes) VALUES($1,$2,$3)`,
    [assetId, mimeType, bytes]
  );
  await db.query(
    `UPDATE automation_jobs SET asset_id=$2, updated_at=NOW() WHERE id=$1`,
    [jobId, assetId]
  );
  return assetId;
}

export async function getAsset(id: string) {
  const result = await db.query<{ mime_type: string; bytes: Buffer }>(
    `SELECT mime_type, bytes FROM content_assets WHERE id=$1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getJob(id: string) {
  const result = await db.query(
    `SELECT j.*, a.mime_type AS image_mime_type
     FROM automation_jobs j LEFT JOIN content_assets a ON a.id=j.asset_id
     WHERE j.id=$1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ? rowToJob(result.rows[0]) : null;
}

export async function getPublishableJobs(now = new Date()) {
  const result = await db.query(
    `SELECT j.*, a.mime_type AS image_mime_type
     FROM automation_jobs j
     LEFT JOIN content_assets a ON a.id=j.asset_id
     WHERE (j.status='ready' OR (j.status='failed' AND j.attempts < 3))
       AND j.asset_id IS NOT NULL
       AND j.scheduled_for <= $1
     ORDER BY j.scheduled_for ASC
     LIMIT 3`,
    [now]
  );
  return result.rows.map(rowToJob);
}

export async function hasJobForLocalSlot(dayKey: string, hour: number) {
  const result = await db.query(
    `SELECT 1 FROM automation_jobs
     WHERE to_char(scheduled_for AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD')=$1
       AND EXTRACT(HOUR FROM scheduled_for AT TIME ZONE 'America/Sao_Paulo')=$2
       AND NOT (status='failed' AND asset_id IS NULL)
     LIMIT 1`,
    [dayKey, hour]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function markPublishing(id: string) {
  await db.query(
    `UPDATE automation_jobs SET status='publishing', attempts=attempts+1, updated_at=NOW() WHERE id=$1`,
    [id]
  );
}

export async function markPublished(id: string, mediaId: string) {
  await db.query(
    `UPDATE automation_jobs
     SET status='published', published_media_id=$2, error=NULL, updated_at=NOW()
     WHERE id=$1`,
    [id, mediaId]
  );
}

export async function markFailed(id: string, error: string) {
  await db.query(
    `UPDATE automation_jobs
     SET status='failed', error=$2, updated_at=NOW()
     WHERE id=$1`,
    [id, error.slice(0, 3000)]
  );
}

export async function recordRun(agent: AutomationAgent, status: string, detail?: string) {
  await db.query(
    `INSERT INTO automation_runs(id, agent, status, detail) VALUES($1,$2,$3,$4)`,
    [randomUUID(), agent, status, detail ?? null]
  );
}

export async function getRecentLearningMemory(limit = 12) {
  const result = await db.query<{ agent: string; detail: string | null; created_at: Date }>(
    `SELECT agent, detail, created_at FROM automation_runs
     WHERE status IN ('success','partial')
       AND agent IN ('researcher','auditor')
       AND detail IS NOT NULL
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows
    .map((row) => `${row.agent} ${new Date(row.created_at).toISOString()}: ${row.detail}`)
    .join("\n")
    .slice(0, 12000);
}

export async function listRecentJobs(limit = 20) {
  const result = await db.query(
    `SELECT j.*, a.mime_type AS image_mime_type
     FROM automation_jobs j LEFT JOIN content_assets a ON a.id=j.asset_id
     ORDER BY j.created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows.map(rowToJob);
}


let dailyScheduleTableReady = false;

async function ensureDailyScheduleTable() {
  if (dailyScheduleTableReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS automation_daily_schedules(
      day_key TEXT PRIMARY KEY,
      hours_json TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'adaptive',
      detail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  dailyScheduleTableReady = true;
}

export async function getDailyPostSchedule(dayKey: string): Promise<number[] | null> {
  await ensureDailyScheduleTable();
  const result = await db.query<{ hours_json: string }>(
    `SELECT hours_json FROM automation_daily_schedules WHERE day_key=$1 LIMIT 1`,
    [dayKey]
  );
  const raw = result.rows[0]?.hours_json;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const hours = Array.isArray(parsed)
      ? parsed.map(Number).filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23)
      : [];
    return [...new Set(hours)].sort((a, b) => a - b).slice(0, 3);
  } catch {
    return null;
  }
}

export async function saveDailyPostSchedule(dayKey: string, hours: number[], source = "adaptive", detail = "") {
  await ensureDailyScheduleTable();
  const clean = [...new Set(hours.map(Number).filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23))]
    .sort((a, b) => a - b)
    .slice(0, 3);
  await db.query(
    `INSERT INTO automation_daily_schedules(day_key,hours_json,source,detail)
     VALUES($1,$2,$3,$4)
     ON CONFLICT(day_key) DO UPDATE
       SET hours_json=EXCLUDED.hours_json, source=EXCLUDED.source, detail=EXCLUDED.detail, updated_at=NOW()`,
    [dayKey, JSON.stringify(clean), source, detail.slice(0, 3000)]
  );
  return clean;
}

export async function countJobsForLocalDay(dayKey: string) {
  const result = await db.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM automation_jobs
     WHERE to_char(scheduled_for AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD')=$1
       AND NOT (status='failed' AND asset_id IS NULL)`,
    [dayKey]
  );
  return Number(result.rows[0]?.total || 0);
}
