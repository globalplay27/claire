export type InstagramCommentEvent = {
  kind: "comment";
  eventId: string;
  commentId: string;
  text: string;
  userId: string;
  username?: string;
  mediaId?: string;
};

export type InstagramMessageEvent = {
  kind: "message";
  eventId: string;
  messageId: string;
  text: string;
  senderId: string;
};

export type InstagramEvent = InstagramCommentEvent | InstagramMessageEvent;

type AnyRecord = Record<string, any>;

export function extractInstagramEvents(payload: AnyRecord): InstagramEvent[] {
  const events: InstagramEvent[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      if (change.field === "comments" || value.text && (value.id || value.comment_id) && value.from) {
        const commentId = String(value.id ?? value.comment_id);
        const userId = String(value.from?.id ?? value.user_id ?? "");
        if (commentId && userId && typeof value.text === "string") {
          events.push({
            kind: "comment",
            eventId: `comment:${commentId}`,
            commentId,
            text: value.text,
            userId,
            username: value.from?.username,
            mediaId: value.media?.id ? String(value.media.id) : undefined
          });
        }
      }
    }

    for (const item of entry.messaging ?? []) {
      const message = item.message ?? {};
      const senderId = String(item.sender?.id ?? "");
      if (senderId && message.mid && typeof message.text === "string" && !message.is_echo) {
        events.push({
          kind: "message",
          eventId: `message:${message.mid}`,
          messageId: String(message.mid),
          text: message.text,
          senderId
        });
      }
    }
  }

  return events;
}
