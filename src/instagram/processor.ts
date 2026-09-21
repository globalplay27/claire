import { FIRST_PRIVATE_REPLY } from "../claire/persona.js";
import { generateClaireReply } from "../claire/agent.js";
import { notifyHumanHandoff } from "../handoff/human.js";
import { detectLeadKeyword } from "../leads/keywords.js";
import {
  claimEvent,
  findLeadByInstagramUserId,
  recentConversation,
  releaseEvent,
  saveMessage,
  updateLeadState,
  upsertLead
} from "../leads/repository.js";
import { classifyLead, hottest } from "../leads/scoring.js";
import { sendDirectMessage, sendPrivateReply } from "./meta-client.js";
import type { InstagramEvent } from "./events.js";

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
        stage: "private_reply_pending"
      });

      const reply = FIRST_PRIVATE_REPLY.replace("QUERO", keyword.toUpperCase());
      const result = await sendPrivateReply(event.commentId, reply);
      await saveMessage({
        leadId: lead.id,
        direction: "outbound",
        body: reply,
        metaMessageId: result?.message_id
      });
      await dbUpdateLeadStage(lead.id, "private_reply_sent");
      return;
    }

    const existing = await findLeadByInstagramUserId(event.senderId);
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

    const classification = classifyLead(event.text);
    const temperature = hottest(lead.temperature, classification.temperature);
    const needsHuman = lead.needs_human || classification.needsHuman;
    const history = await recentConversation(lead.id);
    const reply = await generateClaireReply(history, event.text, needsHuman);

    const sent = await sendDirectMessage(event.senderId, reply);
    await saveMessage({
      leadId: lead.id,
      direction: "outbound",
      body: reply,
      metaMessageId: sent?.message_id
    });

    await updateLeadState({
      leadId: lead.id,
      temperature,
      needsHuman,
      stage: needsHuman ? "human_handoff" : "qualifying",
      summary: needsHuman ? `Lead requer atendimento humano. Última mensagem: ${event.text}` : undefined
    });

    if (needsHuman) {
      await notifyHumanHandoff({
        leadId: lead.id,
        instagramUserId: event.senderId,
        username: lead.instagram_username,
        latestMessage: event.text
      });
    }
  } catch (error) {
    await releaseEvent(event.eventId).catch(() => undefined);
    throw error;
  }
}

async function dbUpdateLeadStage(leadId: string, stage: string) {
  await updateLeadState({
    leadId,
    temperature: "warm",
    needsHuman: false,
    stage
  });
}
