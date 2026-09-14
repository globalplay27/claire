import OpenAI from "openai";
import { env } from "../config/env.js";
import { CLAIRE_SYSTEM_PROMPT } from "./persona.js";

type ConversationMessage = {
  direction: "inbound" | "outbound";
  body: string;
};

const client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

function fallbackReply(userText: string) {
  if (/humano|atendente|pessoa|pagamento|pagar|contratar|assinar/i.test(userText)) {
    return "Perfeito 👍 Vou encaminhar você para nossa equipe continuar por aqui.";
  }
  return "Entendi 😊 Para eu te orientar melhor: seria para uso só seu ou para mais pessoas da família?";
}

export async function generateClaireReply(
  conversation: ConversationMessage[],
  userText: string,
  forceHandoff: boolean
): Promise<string> {
  if (forceHandoff) {
    return "Perfeito 👍 Vou encaminhar você para nossa equipe continuar por aqui.";
  }

  if (!client) return fallbackReply(userText);

  const history = conversation
    .map((message) => `${message.direction === "inbound" ? "CLIENTE" : "CLAIRE"}: ${message.body}`)
    .join("\n");

  const response = await client.responses.create({
    model: env.OPENAI_MODEL,
    instructions: CLAIRE_SYSTEM_PROMPT,
    input: `Histórico da conversa:\n${history}\n\nCLIENTE: ${userText}\n\nResponda somente com a próxima mensagem da Claire.`
  });

  return response.output_text.trim() || fallbackReply(userText);
}
