import { env } from "../config/env.js";

async function metaRequest(path: string, init?: RequestInit) {
  const response = await fetch(`https://graph.instagram.com/${env.META_API_VERSION}/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.INSTAGRAM_ACCESS_TOKEN}`,
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Meta publishing error ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

export async function publishImagePost(imageUrl: string, caption: string) {
  const create: any = await metaRequest(`${env.INSTAGRAM_ACCOUNT_ID}/media`, {
    method: "POST",
    body: JSON.stringify({ image_url: imageUrl, caption })
  });
  if (!create?.id) throw new Error("Meta não retornou o ID do container");

  for (let attempt = 0; attempt < 12; attempt++) {
    const status: any = await metaRequest(`${create.id}?fields=status_code`);
    if (status?.status_code === "FINISHED") break;
    if (status?.status_code === "ERROR" || status?.status_code === "EXPIRED") {
      throw new Error(`Container Meta terminou com status ${status.status_code}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const published: any = await metaRequest(`${env.INSTAGRAM_ACCOUNT_ID}/media_publish`, {
    method: "POST",
    body: JSON.stringify({ creation_id: create.id })
  });
  if (!published?.id) throw new Error("Meta não retornou o ID da publicação");
  return String(published.id);
}
