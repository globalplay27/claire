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
import { sendDirectMessage, sendPrivateReply } from "./meta-client.js";
import type { InstagramEvent } from "./events.js";

function whatsappHandoffMessage(triggerKeyword?: string) {
  const intro = triggerKeyword
    ? `Oi! 😊 Eu sou a Claire, assistente virtual da Global Play. Vi que você comentou ${triggerKeyword.toUpperCase()}.`
    : "Oi! 😊 Eu sou a Claire, assistente virtual da Global Play.";

  if (env.BRAND_WHATSAPP_URL) {
    return `${intro} Para continuar seu atendimento com nossa equipe, fale com a gente no WhatsApp: ${env.BRAND_WHATSAPP_URL}`;
  }

  return `${intro} Nosso atendimento comercial continua pelo WhatsApp. O link ainda não está configurado aqui no Instagram.`;
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
        stage: "whatsapp_handoff_pending"
      });

      const reply = whatsappHandoffMessage(keyword);
      const result = await sendPrivateReply(event.commentId, reply);
      await saveMessage({
        leadId: lead.id,
        direction: "outbound",
        body: reply,
        metaMessageId: result?.message_id
      });
      await setLeadStage(lead.id, "whatsapp_handoff");
      return;
    }

    const existing = await findLeadByInstagramUserId(event.senderId);

    if (existing?.stage === "whatsapp_handoff") {
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

    const reply = whatsappHandoffMessage();
    const sent = await sendDirectMessage(event.senderId, reply);
    await saveMessage({
      leadId: lead.id,
      direction: "outbound",
      body: reply,
      metaMessageId: sent?.message_id
    });
    await setLeadStage(lead.id, "whatsapp_handoff");
  } catch (error) {
    await releaseEvent(event.eventId).catch(() => undefined);
    throw error;
  }
}
