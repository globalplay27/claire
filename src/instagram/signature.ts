import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

function matchesSecret(rawBody: Buffer, signatureHeader: string, secret: string) {
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyMetaSignature(rawBody: Buffer | undefined, signatureHeader: string | undefined) {
  if (!rawBody || !signatureHeader?.startsWith("sha256=")) return false;

  const secrets = [env.INSTAGRAM_APP_SECRET, env.META_APP_SECRET].filter(
    (value): value is string => Boolean(value)
  );

  return secrets.some((secret) => matchesSecret(rawBody, signatureHeader, secret));
}
