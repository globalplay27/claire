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
import { sendDirectMessageWithContacts, sendPrivateReplyWithContacts } from "./meta-client.js";
import type { InstagramEvent } from "./events.js";

function contactChoiceMessage(triggerKeyword?: string) {
  const intro = triggerKeyword
    ? `Oi! 😊 Vi que você escreveu ${triggerKeyword.toUpperCase()}.`
    : "Oi! 😊 Eu sou a Claire, assistente virtual da Global Play.";

  return `${intro}

Como você prefere continuar?

📲 WhatsApp: (21) 96481-6185
🌐 Site: globalplay.fun

Escolha uma opção abaixo e eu já te direciono.`;
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

      const reply = contactChoiceMessage(keyword);
      const result = await sendPrivateReplyWithContacts(
        event.commentId,
        reply,
        env.BRAND_SITE_URL,
        env.BRAND_WHATSAPP_URL
      );
      await saveMessage({
        leadId: lead.id,
        direction: "outbound",
        body: `${reply} [Falar no WhatsApp] [Acessar site]`,
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

      const keyword = detectLeadKeyword(event.text);
      if (keyword) {
        const reply = contactChoiceMessage(keyword);
        const sent = await sendDirectMessageWithContacts(
          event.senderId,
          reply,
          env.BRAND_SITE_URL,
          env.BRAND_WHATSAPP_URL
        );
        await saveMessage({
          leadId: existing.id,
          direction: "outbound",
          body: `${reply} [Falar no WhatsApp] [Acessar site]`,
          metaMessageId: sent?.message_id
        });
      }
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

    const reply = contactChoiceMessage();
    const sent = await sendDirectMessageWithContacts(
      event.senderId,
      reply,
      env.BRAND_SITE_URL,
      env.BRAND_WHATSAPP_URL
    );
    await saveMessage({
      leadId: lead.id,
      direction: "outbound",
      body: `${reply} [Falar no WhatsApp] [Acessar site]`,
      metaMessageId: sent?.message_id
    });
    await setLeadStage(lead.id, "site_handoff");
  } catch (error) {
    await releaseEvent(event.eventId).catch(() => undefined);
    throw error;
  }
}
