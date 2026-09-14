import { Router } from "express";
import { env } from "../config/env.js";
import { extractInstagramEvents } from "./events.js";
import { processInstagramEvent } from "./processor.js";
import { verifyMetaSignature } from "./signature.js";

export const instagramRouter = Router();

instagramRouter.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.META_VERIFY_TOKEN && typeof challenge === "string") {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

instagramRouter.post("/webhook", (req, res) => {
  const signature = req.get("x-hub-signature-256");
  if (!verifyMetaSignature(req.rawBody, signature)) {
    res.sendStatus(401);
    return;
  }

  const events = extractInstagramEvents(req.body);
  res.sendStatus(200);

  void Promise.allSettled(events.map((event) => processInstagramEvent(event))).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") console.error("Webhook processing failed", result.reason);
    }
  });
});
