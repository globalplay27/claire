import { env } from "../config/env.js";

const baseUrl = `https://graph.instagram.com/${env.META_API_VERSION}/${env.INSTAGRAM_ACCOUNT_ID}`;

async function metaPost(body: unknown) {
  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.INSTAGRAM_ACCESS_TOKEN}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Meta API error ${response.status}: ${JSON.stringify(json)}`);
  }
  return json as { message_id?: string; recipient_id?: string } | null;
}

export async function sendPrivateReply(commentId: string, text: string) {
  return metaPost({
    recipient: { comment_id: commentId },
    message: { text }
  });
}

export async function sendDirectMessage(instagramScopedUserId: string, text: string) {
  return metaPost({
    recipient: { id: instagramScopedUserId },
    message: { text }
  });
}
