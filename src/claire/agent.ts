import OpenAI from "openai";
import { env } from "../config/env.js";
import { CLAIRE_SYSTEM_PROMPT, HANDOFF_REPLY, immediateReply } from "./persona.js";

type ConversationMessage = {
  direction: "inbound" | "outbound";
  body: string;
};

const client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

export async function generateClaireReply(
  conversation: ConversationMessage[],
  userText: string,
  forceHandoff: boolean
): Promise<string> {
  const introduce = (reply: string) => conversation.some((message) => message.direction === "outbound")
    ? reply
    : `Sou a Claire, assistente virtual da Global Play. ${reply}`;
  const immediate = immediateReply(userText, forceHandoff);
  if (immediate) return introduce(immediate);
  if (!client) return introduce(HANDOFF_REPLY);

  try {
    const response = await client.responses.create({
      model: env.OPENAI_MODEL,
      instructions: CLAIRE_SYSTEM_PROMPT,
      input: [
        ...conversation.map((message) => ({
          role: message.direction === "inbound" ? "user" as const : "assistant" as const,
          content: message.body
        })),
        { role: "user", content: userText }
      ]
    });
    return response.output_text.trim() || introduce(HANDOFF_REPLY);
  } catch {
    console.error("Claire AI response unavailable; using contact fallback");
    return introduce(HANDOFF_REPLY);
  }
}
