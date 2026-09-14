import { env } from "../config/env.js";

export async function notifyHumanHandoff(payload: {
  leadId: string;
  instagramUserId: string;
  username?: string | null;
  latestMessage: string;
}) {
  if (!env.HUMAN_HANDOFF_URL) return;

  const response = await fetch(env.HUMAN_HANDOFF_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Human handoff webhook failed: ${response.status}`);
  }
}
