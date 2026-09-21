import { env } from "../config/env.js";

type ConversationMessage = {
  direction: "inbound" | "outbound";
  body: string;
};

function whatsappReply() {
  if (env.BRAND_WHATSAPP_URL) {
    return `Para continuar seu atendimento com nossa equipe, fale com a gente no WhatsApp: ${env.BRAND_WHATSAPP_URL}`;
  }
  return "Nosso atendimento comercial continua pelo WhatsApp. O link ainda não está configurado aqui no Instagram.";
}

export async function generateClaireReply(
  _conversation: ConversationMessage[],
  _userText: string,
  _forceHandoff: boolean
): Promise<string> {
  return whatsappReply();
}
