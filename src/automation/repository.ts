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

export async function hasJobForLocalDay(dayKey: string) {
  const result = await db.query(
    `SELECT 1 FROM automation_jobs
     WHERE to_char(scheduled_for AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD')=$1
     LIMIT 1`,
    [dayKey]
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

export async function listRecentJobs(limit = 20) {
  const result = await db.query(
    `SELECT j.*, a.mime_type AS image_mime_type
     FROM automation_jobs j LEFT JOIN content_assets a ON a.id=j.asset_id
     ORDER BY j.created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows.map(rowToJob);
}
