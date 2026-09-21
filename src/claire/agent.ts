import { env } from "../config/env.js";

type ConversationMessage = {
  direction: "inbound" | "outbound";
  body: string;
};

function siteReply() {
  return `Veja planos, informações e atendimento no site oficial da Global Play: ${env.BRAND_SITE_URL}`;
}

export async function generateClaireReply(
  _conversation: ConversationMessage[],
  _userText: string,
  _forceHandoff: boolean
): Promise<string> {
  return siteReply();
}
