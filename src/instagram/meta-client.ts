import { env } from "../config/env.js";

const messagesUrl = `https://graph.instagram.com/${env.META_API_VERSION}/me/messages`;

async function metaPost(body: unknown) {
  const response = await fetch(messagesUrl, {
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

function contactButtonsMessage(text: string, siteUrl: string, whatsappUrl: string) {
  return {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text,
        buttons: [
          {
            type: "web_url",
            url: whatsappUrl,
            title: "Falar no WhatsApp"
          },
          {
            type: "web_url",
            url: siteUrl,
            title: "Acessar site"
          }
        ]
      }
    }
  };
}

function websiteButtonMessage(text: string, url: string) {
  return {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text,
        buttons: [
          {
            type: "web_url",
            url,
            title: "Acessar site"
          }
        ]
      }
    }
  };
}

export async function sendPrivateReply(commentId: string, text: string) {
  return metaPost({
    recipient: { comment_id: commentId },
    message: { text }
  });
}

export async function sendPrivateReplyWithWebsite(commentId: string, text: string, url: string) {
  return metaPost({
    recipient: { comment_id: commentId },
    message: websiteButtonMessage(text, url)
  });
}

export async function sendDirectMessage(instagramScopedUserId: string, text: string) {
  return metaPost({
    recipient: { id: instagramScopedUserId },
    message: { text }
  });
}

export async function sendDirectMessageWithWebsite(instagramScopedUserId: string, text: string, url: string) {
  return metaPost({
    recipient: { id: instagramScopedUserId },
    message: websiteButtonMessage(text, url)
  });
}


export async function sendPrivateReplyWithContacts(
  commentId: string,
  text: string,
  siteUrl: string,
  whatsappUrl: string
) {
  return metaPost({
    recipient: { comment_id: commentId },
    message: contactButtonsMessage(text, siteUrl, whatsappUrl)
  });
}

export async function sendDirectMessageWithContacts(
  instagramScopedUserId: string,
  text: string,
  siteUrl: string,
  whatsappUrl: string
) {
  return metaPost({
    recipient: { id: instagramScopedUserId },
    message: contactButtonsMessage(text, siteUrl, whatsappUrl)
  });
}
