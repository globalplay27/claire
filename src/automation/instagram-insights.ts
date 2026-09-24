import { env } from "../config/env.js";

type MediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
};

export type AccountAudit = {
  available: boolean;
  sampleSize: number;
  topPatterns: string[];
  weakPatterns: string[];
  summary: string;
  formatSignal?: string;
  trendSignal?: string;
};

async function graphGet(path: string) {
  const url = `https://graph.instagram.com/${env.META_API_VERSION}/${path}`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${env.INSTAGRAM_ACCESS_TOKEN}` }
  });
  if (!response.ok) throw new Error(`Instagram audit API ${response.status}`);
  return response.json() as Promise<any>;
}

async function fetchInsightMetric(mediaId: string, metric: string): Promise<number | null> {
  try {
    const json = await graphGet(`${mediaId}/insights?metric=${encodeURIComponent(metric)}`);
    const value = json?.data?.[0]?.values?.[0]?.value ?? json?.data?.[0]?.value;
    return typeof value === "number" ? value : Number.isFinite(Number(value)) ? Number(value) : null;
  } catch {
    return null;
  }
}

export type InstagramInsightSnapshot = {
  ok: boolean;
  source: string;
  username: string;
  followersCount: number;
  mediaCount: number;
  items: Array<{
    id: string;
    caption: string;
    timestamp: string | null;
    mediaType: string;
    likeCount: number;
    commentsCount: number;
    permalink: string;
    reach: number | null;
    views: number | null;
    saved: number | null;
    shares: number | null;
    totalInteractions: number | null;
    insightMetrics: string[];
    insightError: string;
  }>;
  insightErrors: Array<{ id: string; error: string }>;
  profileError: string;
};

async function fetchInsightMetrics(mediaId: string) {
  const metrics = ["reach", "views", "saved", "shares", "total_interactions"];
  const result: Record<string, number | null> = {};
  const errors: string[] = [];

  await Promise.all(metrics.map(async (metric) => {
    try {
      result[metric] = await fetchInsightMetric(mediaId, metric);
    } catch (error) {
      result[metric] = null;
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }));

  return {
    reach: result.reach ?? null,
    views: result.views ?? null,
    saved: result.saved ?? null,
    shares: result.shares ?? null,
    totalInteractions: result.total_interactions ?? null,
    insightMetrics: metrics.filter((metric) => result[metric] !== null),
    insightError: errors.join("; ").slice(0, 240)
  };
}

export async function getInstagramInsightSnapshot(limit = 25): Promise<InstagramInsightSnapshot> {
  const safeLimit = Math.max(1, Math.min(25, Number(limit) || 25));
  let profileError = "";
  let username = "";
  let followersCount = 0;
  let mediaCount = 0;

  try {
    const profile = await graphGet(
      `${env.INSTAGRAM_ACCOUNT_ID}?fields=username,followers_count,media_count`
    );
    username = String(profile?.username || "");
    followersCount = Math.max(0, Number(profile?.followers_count || 0));
    mediaCount = Math.max(0, Number(profile?.media_count || 0));
  } catch (error) {
    profileError = error instanceof Error ? error.message : String(error);
  }

  const json = await graphGet(
    `${env.INSTAGRAM_ACCOUNT_ID}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=${safeLimit}`
  );
  const media: MediaItem[] = Array.isArray(json?.data) ? json.data : [];
  const items = await Promise.all(media.map(async (item) => {
    const insight = await fetchInsightMetrics(item.id);
    return {
      id: String(item.id || ""),
      caption: String(item.caption || "").slice(0, 2200),
      timestamp: item.timestamp || null,
      mediaType: String(item.media_type || ""),
      likeCount: Math.max(0, Number(item.like_count || 0)),
      commentsCount: Math.max(0, Number(item.comments_count || 0)),
      permalink: String(item.permalink || ""),
      ...insight
    };
  }));

  const insightErrors = items
    .filter((item) => item.insightError)
    .map((item) => ({ id: item.id, error: item.insightError }))
    .slice(0, 10);

  return {
    ok: true,
    source: "claire-instagram-api",
    username,
    followersCount,
    mediaCount,
    items,
    insightErrors,
    profileError: profileError.slice(0, 240)
  };
}

export async function auditOwnInstagramContent(): Promise<AccountAudit> {
  try {
    const json = await graphGet(
      `${env.INSTAGRAM_ACCOUNT_ID}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=20`
    );
    const media: MediaItem[] = Array.isArray(json?.data) ? json.data : [];
    if (!media.length) {
      return { available: false, sampleSize: 0, topPatterns: [], weakPatterns: [], summary: "Ainda não há amostra suficiente da própria conta." };
    }

    const median = (values: number[]) => {
      const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
      if (!clean.length) return 0;
      const middle = Math.floor(clean.length / 2);
      const center = clean[middle]!;
      return clean.length % 2 ? center : (clean[middle - 1]! + center) / 2;
    };

    const scored: Array<{
      item: MediaItem;
      reach: number | null;
      saved: number | null;
      shares: number | null;
      score: number;
      reachVelocity: number | null;
    }> = [];

    for (const item of media.slice(0, 16)) {
      const [reach, saved, shares] = await Promise.all([
        fetchInsightMetric(item.id, "reach"),
        fetchInsightMetric(item.id, "saved"),
        fetchInsightMetric(item.id, "shares")
      ]);
      const likes = Number(item.like_count || 0);
      const comments = Number(item.comments_count || 0);
      const weighted = likes + comments * 2 + (saved || 0) * 3 + (shares || 0) * 4;
      const score = reach && reach > 0 ? weighted / reach : weighted;
      const timestamp = item.timestamp ? new Date(item.timestamp).getTime() : NaN;
      const ageHours = Number.isFinite(timestamp) ? Math.max(0, (Date.now() - timestamp) / 3600000) : 0;
      const reachVelocity = reach && reach > 0 && ageHours >= 3
        ? reach / Math.max(3, Math.min(ageHours, 72))
        : null;
      scored.push({ item, reach, saved, shares, score, reachVelocity });
    }

    const medianReach = median(scored.map((x) => Number(x.reach || 0)).filter((x) => x > 0));
    const reliableReachFloor = Math.max(20, medianReach * 0.75);
    const reliable = scored.filter((x) => Number(x.reach || 0) >= reliableReachFloor);

    const ranked = [...(reliable.length ? reliable : scored)].sort((a, b) => b.score - a.score);
    const top = ranked.slice(0, Math.min(4, ranked.length));
    const bottom = [...(reliable.length ? reliable : scored)].sort((a, b) => a.score - b.score).slice(0, Math.min(3, ranked.length));

    const formatMap = new Map<string, number[]>();
    for (const row of scored) {
      if (row.reachVelocity === null) continue;
      const key = String(row.item.media_type || "POST").toUpperCase();
      const current = formatMap.get(key) || [];
      current.push(row.reachVelocity);
      formatMap.set(key, current);
    }
    const formatStats = [...formatMap.entries()]
      .map(([format, values]) => ({ format, medianVelocity: median(values), posts: values.length }))
      .sort((a, b) => b.medianVelocity - a.medianVelocity);
    const bestFormat = formatStats[0];
    const secondFormat = formatStats[1];
    const formatSignal = bestFormat && secondFormat && bestFormat.medianVelocity > secondFormat.medianVelocity * 1.3
      ? `${bestFormat.format} está distribuindo mais rápido que ${secondFormat.format} após ajuste pela idade dos posts. Use o mecanismo do formato vencedor e evite repetição visual.`
      : "Não há diferença forte e confiável entre formatos nesta amostra.";

    const ordered = scored
      .filter((x) => x.reachVelocity !== null && x.item.timestamp)
      .sort((a, b) => String(b.item.timestamp).localeCompare(String(a.item.timestamp)));
    const half = Math.min(6, Math.floor(ordered.length / 2));
    const recentVelocity = half >= 3 ? median(ordered.slice(0, half).map((x) => Number(x.reachVelocity))) : 0;
    const priorVelocity = half >= 3 ? median(ordered.slice(half, half * 2).map((x) => Number(x.reachVelocity))) : 0;
    const ratio = priorVelocity > 0 ? recentVelocity / priorVelocity : null;
    const trendSignal = ratio !== null && ratio < 0.7
      ? "A velocidade de alcance recente caiu mesmo após ajuste pela idade dos posts; variar gancho, tema e composição visual é prioridade."
      : "A velocidade de alcance recente não mostra queda forte após ajuste pela idade dos posts.";

    const compact = (x: typeof scored[number]) => {
      const caption = (x.item.caption || "(sem legenda)").replace(/\s+/g, " ").slice(0, 140);
      return `${x.item.media_type || "POST"}: ${caption} | likes=${x.item.like_count || 0} comments=${x.item.comments_count || 0}${x.reach !== null ? ` reach=${x.reach}` : ""}${x.saved !== null ? ` saved=${x.saved}` : ""}${x.shares !== null ? ` shares=${x.shares}` : ""}${x.reachVelocity !== null ? ` reach/h=${x.reachVelocity.toFixed(2)}` : ""}`;
    };

    return {
      available: true,
      sampleSize: scored.length,
      topPatterns: top.map(compact),
      weakPatterns: bottom.map(compact),
      formatSignal,
      trendSignal,
      summary: `Amostra própria: ${scored.length} posts. ${formatSignal} ${trendSignal} Ignore taxas chamativas em posts com alcance minúsculo; use padrões com amostra suficiente.`
    };
  } catch (error) {
    return {
      available: false,
      sampleSize: 0,
      topPatterns: [],
      weakPatterns: [],
      summary: `Auditoria própria indisponível nesta rodada: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

