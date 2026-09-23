import { env } from "../config/env.js";
import { detectLeadKeyword } from "../leads/keywords.js";
import { classifyLead } from "../leads/scoring.js";
import { claimEvent, findLeadByInstagramUserId, recentConversation, releaseEvent, saveMessage, setLeadStage, updateLeadQualification, upsertLead } from "../leads/repository.js";
import { sendDirectMessage, sendDirectMessageWithContacts, sendPrivateReply } from "./meta-client.js";
import type { InstagramEvent } from "./events.js";

const menu = (keyword?: string) => `${keyword ? `Oi! Vi seu comentário com ${keyword.toUpperCase()}. 😊` : `Oi! Eu sou a assistente virtual da ${env.BRAND_NAME}.`}

Para eu te ajudar rápido, responda:
1 ou ASSINAR — quero usar o serviço
2 ou REVENDA — quero vender e gerar renda
3 ou SUPORTE — já sou cliente`;

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const isCustomer = (text: string) => /^(1|assinar|assinatura|cliente|quero usar)\b/.test(normalize(text));
const isReseller = (text: string) => /^(2|revenda|revendedor|revender|quero vender)\b/.test(normalize(text));
const isSupport = (text: string) => /^(3|suporte|ajuda|ja sou cliente)\b/.test(normalize(text));
const numberIn = (text: string) => Number.parseInt(text.match(/\d+/)?.[0] ?? "1", 10);

const AUTOMATION_MARKERS = [
  "sou a assistente virtual",
  "sou o assistente virtual",
  "assistente virtual",
  "atendimento automatico",
  "atendimento automatizado",
  "responda 1",
  "responda 2",
  "responda 3",
  "digite 1",
  "digite 2",
  "escolha uma opcao",
  "escolha uma das opcoes",
  "selecione uma opcao",
  "para eu te ajudar rapido",
  "para continuar escolha",
  "menu de atendimento",
  "falar no whatsapp",
  "acesse nosso site"
];

const loopText = (text: string) =>
  normalize(text)
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b\d{2,}\b/g, "#")
    .replace(/[^a-z0-9# ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function automationMarkerScore(text: string) {
  const value = loopText(text);
  return AUTOMATION_MARKERS.reduce((score, marker) => score + (value.includes(marker) ? 1 : 0), 0);
}

async function shouldSuppressAutomationLoop(leadId: string, inboundText: string) {
  const history = await recentConversation(leadId, 16);
  const now = Date.now();
  const recent = history.filter(item => {
    const at = new Date(item.created_at).getTime();
    return Number.isFinite(at) && now - at <= 10 * 60 * 1000;
  });
  const normalizedInbound = loopText(inboundText);
  const recentInbound = recent.filter(item => item.direction === "inbound");
  const recentOutbound = recent.filter(item => item.direction === "outbound");
  const sameInboundCount = recentInbound.filter(item => loopText(item.body) === normalizedInbound).length;
  const markerScore = automationMarkerScore(inboundText);
  const outboundBurst = recentOutbound.length;
  const inboundBurst = recentInbound.length;

  // Strong bot signature: menu-like automated copy after we have already replied.
  if (markerScore >= 2 && outboundBurst >= 1) return "automation_signature";

  // Same automated payload arriving again after our responses.
  if (sameInboundCount >= 2 && outboundBurst >= 2) return "repeated_inbound";

  // Circuit breaker for a fast ping-pong even when wording changes.
  if (inboundBurst >= 5 && outboundBurst >= 5) return "rapid_ping_pong";

  // Secondary guard: several bot-like turns in a short burst.
  const automatedInbound = recentInbound.filter(item => automationMarkerScore(item.body) >= 1).length;
  if (automatedInbound >= 3 && outboundBurst >= 3) return "automation_burst";

  return "";
}


async function direct(leadId: string, recipient: string, body: string, contacts = false) {
  const sent = contacts
    ? await sendDirectMessageWithContacts(recipient, body, env.BRAND_SITE_URL, env.BRAND_WHATSAPP_URL)
    : await sendDirectMessage(recipient, body);
  await saveMessage({ leadId, direction: "outbound", body, metaMessageId: sent?.message_id });
}

async function qualify(senderId: string, lead: Awaited<ReturnType<typeof upsertLead>>, text: string) {
  if (isSupport(text)) {
    await updateLeadQualification({ leadId: lead.id, intent: "support", scoreDelta: 50, stage: "human_handoff", temperature: "hot", needsHuman: true });
    return direct(lead.id, senderId, "Entendi. Vou te encaminhar ao atendimento humano. Toque no WhatsApp e envie seu nome e o problema:", true);
  }
  if (["choose_interest", "dm_started", "new"].includes(lead.stage)) {
    if (isCustomer(text)) {
      await updateLeadQualification({ leadId: lead.id, intent: "customer", scoreDelta: 20, stage: "client_devices", temperature: "warm" });
      return direct(lead.id, senderId, "Perfeito! Em quantos aparelhos você pretende usar? Responda apenas com o número (ex.: 1, 2 ou 3)." );
    }
    if (isReseller(text)) {
      await updateLeadQualification({ leadId: lead.id, intent: "reseller", scoreDelta: 25, stage: "reseller_experience", temperature: "warm" });
      return direct(lead.id, senderId, "Ótima escolha. Você já trabalha com revenda ou está começando agora?" );
    }
    return direct(lead.id, senderId, menu());
  }
  if (lead.stage === "client_devices") {
    const devices = Math.max(1, Math.min(20, numberIn(text)));
    await updateLeadQualification({ leadId: lead.id, devices, scoreDelta: devices > 1 ? 15 : 10, stage: "client_pain" });
    return direct(lead.id, senderId, "Qual é sua prioridade: estabilidade, variedade de conteúdo, preço ou suporte rápido?");
  }
  if (lead.stage === "client_pain") {
    const result = classifyLead(text);
    await updateLeadQualification({ leadId: lead.id, interest: text.slice(0, 500), scoreDelta: 30, stage: "qualified", temperature: result.temperature === "cold" ? "hot" : result.temperature, needsHuman: true });
    return direct(lead.id, senderId, "Obrigado! Seu perfil está qualificado. Fale agora com nossa equipe para receber o plano mais adequado:", true);
  }
  if (lead.stage === "reseller_experience") {
    await updateLeadQualification({ leadId: lead.id, interest: text.slice(0, 500), scoreDelta: 20, stage: "reseller_volume" });
    return direct(lead.id, senderId, "Quantos clientes você pretende atender nos próximos 30 dias? Responda um número ou “estou começando”.");
  }
  if (lead.stage === "reseller_volume") {
    const volume = numberIn(text);
    await updateLeadQualification({ leadId: lead.id, interest: text.slice(0, 500), scoreDelta: volume >= 10 ? 45 : 30, stage: "qualified", temperature: "hot", needsHuman: true });
    return direct(lead.id, senderId, "Perfil de revenda qualificado! Toque no WhatsApp e envie “REVENDA” para receber a tabela completa:", true);
  }
  return direct(lead.id, senderId, "Seu cadastro já está com o comercial. Para agilizar, toque no WhatsApp:", true);
}

export async function processInstagramEvent(event: InstagramEvent) {
  if (!await claimEvent(event.eventId, event.kind)) return;
  try {
    if (event.kind === "comment") {
      const keyword = detectLeadKeyword(event.text);
      if (!keyword) return;
      const lead = await upsertLead({ instagramUserId: event.userId, instagramUsername: event.username, triggerKeyword: keyword, campaign: event.mediaId, sourceMediaId: event.mediaId, brand: env.BRAND_NAME, stage: "choose_interest" });
      const reply = menu(keyword);
      const sent = await sendPrivateReply(event.commentId, reply);
      await saveMessage({ leadId: lead.id, direction: "outbound", body: reply, metaMessageId: sent?.message_id });
      return;
    }
    const lead = await findLeadByInstagramUserId(event.senderId) ?? await upsertLead({ instagramUserId: event.senderId, brand: env.BRAND_NAME, stage: "dm_started" });
    await saveMessage({ leadId: lead.id, direction: "inbound", body: event.text, metaMessageId: event.messageId });
    const loopReason = await shouldSuppressAutomationLoop(lead.id, event.text);
    if (loopReason) {
      await setLeadStage(lead.id, "automation_suppressed");
      console.warn("Instagram DM automation loop suppressed", {
        leadId: lead.id,
        reason: loopReason
      });
      return;
    }
    return qualify(event.senderId, lead, event.text);
  } catch (error) {
    await releaseEvent(event.eventId).catch(() => undefined);
    throw error;
  }
}
