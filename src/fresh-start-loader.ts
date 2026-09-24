const RESET_CUTOFF = Date.parse("2026-09-24T11:00:00.000Z");
const TEST_DAY = "2026-09-24";

function saoPauloDay() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

if (saoPauloDay() === TEST_DAY) {
  process.env.ADAPTIVE_POST_TIMES = "false";
  process.env.AUTO_POST_HOURS = "9,12,16";
}

const originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: any, init?: any) => {
  const response = await originalFetch(input, init);
  try {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : String(input?.url || "");
    const parsed = new URL(url);
    const isInstagramMediaList =
      parsed.hostname === "graph.instagram.com" &&
      /\/media$/.test(parsed.pathname) &&
      parsed.searchParams.get("fields")?.includes("timestamp");

    if (!isInstagramMediaList || !response.ok) return response;

    const payload = await response.clone().json() as any;
    if (!Array.isArray(payload?.data)) return response;

    payload.data = payload.data.filter((item: any) => {
      const ts = Date.parse(String(item?.timestamp || ""));
      return Number.isFinite(ts) && ts >= RESET_CUTOFF;
    });

    return new Response(JSON.stringify(payload), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch {
    return response;
  }
}) as typeof fetch;

console.log(
  `[fresh-start] cutoff=2026-09-24T08:00:00-03:00 test_day=${saoPauloDay() === TEST_DAY ? "09,12,16" : "adaptive"}`
);
