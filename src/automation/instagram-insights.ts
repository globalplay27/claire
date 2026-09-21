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

export async function auditOwnInstagramContent(): Promise<AccountAudit> {
  try {
    const json = await graphGet(
      `${env.INSTAGRAM_ACCOUNT_ID}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=20`
    );
    const media: MediaItem[] = Array.isArray(json?.data) ? json.data : [];
    if (!media.length) {
      return { available: false, sampleSize: 0, topPatterns: [], weakPatterns: [], summary: "Ainda não há amostra suficiente da própria conta." };
    }

    const scored: Array<{ item: MediaItem; reach: number | null; saved: number | null; shares: number | null; score: number }> = [];
    for (const item of media.slice(0, 12)) {
      const [reach, saved, shares] = await Promise.all([
        fetchInsightMetric(item.id, "reach"),
        fetchInsightMetric(item.id, "saved"),
        fetchInsightMetric(item.id, "shares")
      ]);
      const likes = Number(item.like_count || 0);
      const comments = Number(item.comments_count || 0);
      const score = reach && reach > 0
        ? (likes + comments * 2 + (saved || 0) * 3 + (shares || 0) * 4) / reach
        : likes + comments * 2 + (saved || 0) * 3 + (shares || 0) * 4;
      scored.push({ item, reach, saved, shares, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, Math.min(4, scored.length));
    const bottom = scored.slice(-Math.min(3, scored.length));

    const compact = (x: typeof scored[number]) => {
      const caption = (x.item.caption || "(sem legenda)").replace(/\s+/g, " ").slice(0, 140);
      return `${x.item.media_type || "POST"}: ${caption} | likes=${x.item.like_count || 0} comments=${x.item.comments_count || 0}${x.reach !== null ? ` reach=${x.reach}` : ""}${x.saved !== null ? ` saved=${x.saved}` : ""}${x.shares !== null ? ` shares=${x.shares}` : ""}`;
    };

    return {
      available: true,
      sampleSize: scored.length,
      topPatterns: top.map(compact),
      weakPatterns: bottom.map(compact),
      summary: `Amostra própria: ${scored.length} posts. Use os padrões dos melhores como sinal, não como certeza; evite repetir os piores sem novo teste.`
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
