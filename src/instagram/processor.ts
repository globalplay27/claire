import { env } from "../config/env.js";
import { detectLeadKeyword } from "../leads/keywords.js";
import {
  claimEvent,
  findLeadByInstagramUserId,
  releaseEvent,
  saveMessage,
  setLeadStage,
  upsertLead
} from "../leads/repository.js";
import { sendDirectMessageWithWebsite, sendPrivateReplyWithWebsite } from "./meta-client.js";
import type { InstagramEvent } from "./events.js";

function siteHandoffMessage(triggerKeyword?: string) {
  const intro = triggerKeyword
    ? `Oi! 😊 Eu sou a Claire, assistente virtual da Global Play. Vi que você comentou ${triggerKeyword.toUpperCase()}.`
    : "Oi! 😊 Eu sou a Claire, assistente virtual da Global Play.";

  return `${intro} No nosso site você encontra planos, informações e acesso ao atendimento.`;
}

export async function processInstagramEvent(event: InstagramEvent) {
  const claimed = await claimEvent(event.eventId, event.kind);
  if (!claimed) return;

  try {
    if (event.kind === "comment") {
      const keyword = detectLeadKeyword(event.text);
      if (!keyword) return;

      const lead = await upsertLead({
        instagramUserId: event.userId,
        instagramUsername: event.username,
        triggerKeyword: keyword,
        campaign: event.mediaId,
        stage: "site_handoff_pending"
      });

      const reply = siteHandoffMessage(keyword);
      const result = await sendPrivateReplyWithWebsite(event.commentId, reply, env.BRAND_SITE_URL);
      await saveMessage({
        leadId: lead.id,
        direction: "outbound",
        body: `${reply} [Acessar site]`,
        metaMessageId: result?.message_id
      });
      await setLeadStage(lead.id, "site_handoff");
      return;
    }

    const existing = await findLeadByInstagramUserId(event.senderId);

    if (existing?.stage === "site_handoff") {
      await saveMessage({
        leadId: existing.id,
        direction: "inbound",
        body: event.text,
        metaMessageId: event.messageId
      });
      return;
    }

    const lead = existing ?? await upsertLead({
      instagramUserId: event.senderId,
      stage: "dm_started"
    });

    await saveMessage({
      leadId: lead.id,
      direction: "inbound",
      body: event.text,
      metaMessageId: event.messageId
    });

    const reply = siteHandoffMessage();
    const sent = await sendDirectMessageWithWebsite(event.senderId, reply, env.BRAND_SITE_URL);
    await saveMessage({
      leadId: lead.id,
      direction: "outbound",
      body: `${reply} [Acessar site]`,
      metaMessageId: sent?.message_id
    });
    await setLeadStage(lead.id, "site_handoff");
  } catch (error) {
    await releaseEvent(event.eventId).catch(() => undefined);
    throw error;
  }
}
