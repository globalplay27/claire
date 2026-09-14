import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

export function verifyMetaSignature(rawBody: Buffer | undefined, signatureHeader: string | undefined) {
  if (!env.META_APP_SECRET) return false;
  if (!rawBody || !signatureHeader?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", env.META_APP_SECRET).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);

  return a.length === b.length && timingSafeEqual(a, b);
}
