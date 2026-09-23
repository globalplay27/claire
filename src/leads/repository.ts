import { randomUUID } from "node:crypto";
import { db } from "../database/db.js";
import type { LeadTemperature } from "./scoring.js";

export type Lead = {
  id: string;
  instagram_user_id: string;
  instagram_username: string | null;
  temperature: LeadTemperature;
  stage: string;
  needs_human: boolean;
  brand: string;
  intent: string | null;
  score: number;
};

export async function findLeadByInstagramUserId(instagramUserId: string): Promise<Lead | null> {
  const result = await db.query<Lead>(
    `SELECT id, instagram_user_id, instagram_username, temperature, stage, needs_human,
            brand, intent, score
     FROM leads WHERE instagram_user_id = $1 LIMIT 1`,
    [instagramUserId]
  );
  return result.rows[0] ?? null;
}

export async function upsertLead(input: {
  instagramUserId: string;
  instagramUsername?: string;
  triggerKeyword?: string;
  campaign?: string;
  stage?: string;
  brand?: string;
  intent?: string;
  sourceMediaId?: string;
}): Promise<Lead> {
  const id = randomUUID();
  const result = await db.query<Lead>(
    `INSERT INTO leads (
       id, instagram_user_id, instagram_username, trigger_keyword, campaign, stage,
       temperature, brand, intent, source_media_id, last_contact_at
     ) VALUES ($1,$2,$3,$4,$5,$6,'warm',$7,$8,$9,NOW())
     ON CONFLICT (instagram_user_id) DO UPDATE SET
       instagram_username = COALESCE(EXCLUDED.instagram_username, leads.instagram_username),
       trigger_keyword = COALESCE(EXCLUDED.trigger_keyword, leads.trigger_keyword),
       campaign = COALESCE(EXCLUDED.campaign, leads.campaign),
       stage = COALESCE(EXCLUDED.stage, leads.stage),
       brand = COALESCE(EXCLUDED.brand, leads.brand),
       intent = COALESCE(EXCLUDED.intent, leads.intent),
       source_media_id = COALESCE(EXCLUDED.source_media_id, leads.source_media_id),
       last_contact_at = NOW(),
       updated_at = NOW()
     RETURNING id, instagram_user_id, instagram_username, temperature, stage, needs_human,
               brand, intent, score`,
    [
      id,
      input.instagramUserId,
      input.instagramUsername ?? null,
      input.triggerKeyword ?? null,
      input.campaign ?? null,
      input.stage ?? "new",
      input.brand ?? "global_play",
      input.intent ?? null,
      input.sourceMediaId ?? input.campaign ?? null
    ]
  );
  return result.rows[0]!;
}

export async function updateLeadState(input: {
  leadId: string;
  temperature: LeadTemperature;
  needsHuman: boolean;
  stage?: string;
  summary?: string;
}) {
  await db.query(
    `UPDATE leads
     SET temperature = $2,
         needs_human = $3,
         stage = COALESCE($4, stage),
         summary = COALESCE($5, summary),
         updated_at = NOW()
     WHERE id = $1`,
    [input.leadId, input.temperature, input.needsHuman, input.stage ?? null, input.summary ?? null]
  );
}

export async function saveMessage(input: {
  leadId: string;
  direction: "inbound" | "outbound";
  body: string;
  metaMessageId?: string;
}) {
  await db.query(
    `INSERT INTO lead_messages (id, lead_id, direction, body, meta_message_id)
     VALUES ($1,$2,$3,$4,$5)`,
    [randomUUID(), input.leadId, input.direction, input.body, input.metaMessageId ?? null]
  );
}

export async function recentConversation(leadId: string, limit = 12) {
  const result = await db.query<{ direction: "inbound" | "outbound"; body: string; created_at: string | Date }>(
    `SELECT direction, body, created_at FROM (
       SELECT direction, body, created_at
       FROM lead_messages
       WHERE lead_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     ) t ORDER BY created_at ASC`,
    [leadId, limit]
  );
  return result.rows;
}

export async function claimEvent(eventId: string, eventType: string): Promise<boolean> {
  const result = await db.query(
    `INSERT INTO processed_events(event_id, event_type)
     VALUES ($1,$2)
     ON CONFLICT(event_id) DO NOTHING
     RETURNING event_id`,
    [eventId, eventType]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function releaseEvent(eventId: string) {
  await db.query("DELETE FROM processed_events WHERE event_id = $1", [eventId]);
}

export async function setLeadStage(leadId: string, stage: string) {
  await db.query(
    "UPDATE leads SET stage = $2, updated_at = NOW() WHERE id = $1",
    [leadId, stage]
  );
}

export async function updateLeadQualification(input: {
  leadId: string;
  intent?: string;
  interest?: string;
  devices?: number;
  scoreDelta?: number;
  stage?: string;
  temperature?: LeadTemperature;
  needsHuman?: boolean;
}) {
  await db.query(
    `UPDATE leads SET
       intent=COALESCE($2,intent), interest=COALESCE($3,interest),
       devices=COALESCE($4,devices), score=GREATEST(0,score+$5),
       stage=COALESCE($6,stage), temperature=COALESCE($7,temperature),
       needs_human=COALESCE($8,needs_human), last_contact_at=NOW(), updated_at=NOW()
     WHERE id=$1`,
    [input.leadId, input.intent ?? null, input.interest ?? null, input.devices ?? null,
     input.scoreDelta ?? 0, input.stage ?? null, input.temperature ?? null,
     input.needsHuman ?? null]
  );
}
