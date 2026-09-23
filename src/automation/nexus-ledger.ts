import { env } from "../config/env.js";

type PostContext = {
  postId: string;
  scheduledFor: string;
  scheduledHour: string;
};

let current: PostContext | null = null;

const NEXUS_URL = env.NEXUS_POST_EVENT_URL || "https://servidor-global-play-production.up.railway.app/api/agent/globalplay-streaming/posts/event";

function saoPauloHour(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function scheduledPostId(date: Date, prefix = "globalplay-streaming") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${prefix}:${value("year")}${value("month")}${value("day")}-${value("hour")}${value("minute")}`;
}

async function sendEvent(payload: Record<string, unknown>) {
  if (!env.NEXUS_AGENT_TOKEN) return;
  try {
    await fetch(NEXUS_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.NEXUS_AGENT_TOKEN}`,
        "content-type": "application/json",
        "user-agent": "Claire-Nexus/1.0"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000)
    });
  } catch {
    // NEXUS telemetry must never block publishing.
  }
}

export function beginPostTracking(postId: string, scheduledFor: Date, scheduledHour?: string) {
  current = {
    postId,
    scheduledFor: scheduledFor.toISOString(),
    scheduledHour: scheduledHour || saoPauloHour(scheduledFor)
  };
  void sendEvent({ ...current, status: "generating" });
}

export function clearPostTracking() {
  current = null;
}

export function reportPostStatus(status: string, extra: Record<string, unknown> = {}) {
  if (!current) return;
  void sendEvent({ ...current, status, ...extra });
}

function textRates(model: string) {
  if (model === "gpt-5.6-luna") return { input: 0.20, cached: 0.02, output: 1.20 };
  if (model === "gpt-5.6-terra") return { input: 2.00, cached: 0.20, output: 12.00 };
  if (model === "gpt-5.6-sol") return { input: 4.00, cached: 0.40, output: 20.00 };
  if (model === "gpt-6-luna") return { input: 0.10, cached: 0.01, output: 0.50 };
  if (model === "gpt-6-sol") return { input: 2.00, cached: 0.20, output: 10.00 };
  if (model === "gpt-6-astra") return { input: 10.00, cached: 1.00, output: 50.00 };
  return null;
}

export function addTextUsageCost(usage: any, model: string, extraUsd = 0, source = "openai_usage") {
  if (!current) return;
  const rates = textRates(String(model || ""));
  let value = Number(extraUsd || 0);
  if (rates && usage) {
    const input = Number(usage.input_tokens || 0);
    const cached = Number(usage.input_tokens_details?.cached_tokens || usage.input_tokens_details?.cached_input_tokens || 0);
    const output = Number(usage.output_tokens || 0);
    value += (
      Math.max(0, input - cached) * rates.input
      + Math.max(0, cached) * rates.cached
      + Math.max(0, output) * rates.output
    ) / 1_000_000;
  }
  if (value > 0) void sendEvent({ ...current, status: "generating", costDeltaUsd: value, costSource: source, model });
}

export function addImageUsageCost(usage: any, model: string, size: string, quality: string) {
  if (!current) return;
  const name = String(model || "");
  let value = 0;
  let source = "openai_usage";
  if (name.startsWith("gpt-image-2.5") || name === "gpt-image-2") {
    const rates = name.startsWith("gpt-image-2.5")
      ? { textIn: 5, imageIn: 8, cachedImageIn: 2, imageOut: 30 }
      : { textIn: 2.5, imageIn: 4, cachedImageIn: 1, imageOut: 15 };
    const details = usage?.input_tokens_details || usage?.input_details || {};
    const textIn = Number(details.text_tokens ?? usage?.input_text_tokens ?? usage?.input_tokens ?? 0);
    const imageIn = Number(details.image_tokens ?? usage?.input_image_tokens ?? 0);
    const cachedImageIn = Number(details.cached_image_tokens ?? 0);
    const imageOut = Number(usage?.output_tokens ?? usage?.output_image_tokens ?? 0);
    value = (
      Math.max(0, textIn) * rates.textIn
      + Math.max(0, imageIn - cachedImageIn) * rates.imageIn
      + Math.max(0, cachedImageIn) * rates.cachedImageIn
      + Math.max(0, imageOut) * rates.imageOut
    ) / 1_000_000;
  } else if (name === "gpt-image-1" && size === "1024x1536") {
    const legacy: Record<string, number> = { low: 0.016, medium: 0.063, high: 0.25 };
    value = legacy[quality] || 0;
    source = "openai_pricing_estimate";
  }
  if (value > 0) void sendEvent({ ...current, status: "generating", costDeltaUsd: value, costSource: source, model });
}
