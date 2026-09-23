import { env } from "../config/env.js";
import { detectLeadKeyword } from "../leads/keywords.js";
import { classifyLead } from "../leads/scoring.js";
import {
  claimEvent,
  findLeadByInstagramUserId,
  releaseEvent,
  saveMessage,
  updateLeadQualification,
  upsertLead
} from "../leads/repository.js";
import { sendDirectMessageWithContacts, sendPrivateReplyWithContacts } from "./meta-client.js";
import type { InstagramEvent } from "./events.js";

const CONTACT_MESSAGE = "👇";

async function sendContactButtonsToComment(commentId: string) {
  return sendPrivateReplyWithContacts(
    commentId,
    CONTACT_MESSAGE,
    env.BRAND_SITE_URL,
    env.BRAND_WHATSAPP_URL
  );
}

async function sendContactButtonsToDirect(instagramScopedUserId: string) {
  return sendDirectMessageWithContacts(
    instagramScopedUserId,
    CONTACT_MESSAGE,
    env.BRAND_SITE_URL,
    env.BRAND_WHATSAPP_URL
  );
}

export async function processInstagramEvent(event: InstagramEvent) {
  if (!await claimEvent(event.eventId, event.kind)) return;

  try {
    if (event.kind === "comment") {
      const keyword = detectLeadKeyword(event.text);
      const existing = await findLeadByInstagramUserId(event.userId);
      const lead = existing ?? await upsertLead({
        instagramUserId: event.userId,
        instagramUsername: event.username,
        triggerKeyword: keyword ?? undefined,
        campaign: event.mediaId,
        sourceMediaId: event.mediaId,
        brand: env.BRAND_NAME,
        stage: keyword ? "contact_links_pending" : "commented"
      });

      const classification = classifyLead(event.text);
      await updateLeadQualification({
        leadId: lead.id,
        scoreDelta: keyword ? 12 : 2,
        temperature: keyword ? "warm" : classification.temperature,
        needsHuman: classification.needsHuman
      });
      await saveMessage({ leadId: lead.id, direction: "inbound", body: event.text });

      if (!keyword) return;

      const sent = await sendContactButtonsToComment(event.commentId);
      await saveMessage({
        leadId: lead.id,
        direction: "outbound",
        body: CONTACT_MESSAGE,
        metaMessageId: sent?.message_id
      });
      await updateLeadQualification({
        leadId: lead.id,
        scoreDelta: 8,
        stage: "contact_links_sent",
        temperature: "warm"
      });
      return;
    }

    const existing = await findLeadByInstagramUserId(event.senderId);
    const lead = existing ?? await upsertLead({
      instagramUserId: event.senderId,
      brand: env.BRAND_NAME,
      stage: "dm_started"
    });

    await saveMessage({
      leadId: lead.id,
      direction: "inbound",
      body: event.text,
      metaMessageId: event.messageId
    });

    // One clean handoff only: no menu, no qualification questionnaire and no prices in Direct.
    if (lead.stage === "contact_links_sent") return;

    const sent = await sendContactButtonsToDirect(event.senderId);
    await saveMessage({
      leadId: lead.id,
      direction: "outbound",
      body: CONTACT_MESSAGE,
      metaMessageId: sent?.message_id
    });
    await updateLeadQualification({
      leadId: lead.id,
      scoreDelta: 10,
      stage: "contact_links_sent",
      temperature: "warm"
    });
  } catch (error) {
    await releaseEvent(event.eventId).catch(() => undefined);
    throw error;
  }
}
