import OpenAI from "openai";
import { env } from "../config/env.js";

const client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

function requireClient() {
  if (!client) throw new Error("OPENAI_API_KEY não configurada");
  return client;
}

export async function plannerAgent() {
  const ai = requireClient();
  const response = await ai.responses.create({
    model: env.OPENAI_MODEL,
    instructions: `Você é o agente de planejamento do Instagram da ${env.BRAND_NAME}.
Crie UMA ideia de post para hoje. Público: clientes finais e revendedores.
Objetivo comercial: ${env.BRAND_OBJECTIVE}.
Seja direto, visual e útil. Não invente números, catálogo, depoimentos ou resultados.
Responda JSON puro no formato {"topic":"...","objective":"..."}.`,
    input: "Planeje a próxima publicação."
  });
  const raw = response.output_text.trim().replace(/^\`\`\`json/i, "").replace(/\`\`\`$/i, "").trim();
  const parsed = JSON.parse(raw);
  return {
    topic: String(parsed.topic || "Streaming simples para o dia a dia"),
    objective: String(parsed.objective || env.BRAND_OBJECTIVE)
  };
}

export async function creatorAgent(topic: string, objective: string) {
  const ai = requireClient();
  const response = await ai.responses.create({
    model: env.OPENAI_MODEL,
    instructions: `Você é o agente criativo do Instagram da ${env.BRAND_NAME} (${env.BRAND_INSTAGRAM}).
Siga estas regras: português brasileiro natural; texto curto; primeira linha forte; uma ideia central; CTA natural; sem falsas promessas; sem inventar números, catálogo, clientes ou métricas.
Gere também uma direção visual limpa, premium, sem poluição visual e sem texto excessivo na arte.
Responda JSON puro no formato {"caption":"...","imagePrompt":"..."}.
O imagePrompt deve estar em inglês, pedir formato vertical 4:5 (1080x1350), imagem publicitária premium e NÃO deve pedir logos de terceiros.`,
    input: `Tema: ${topic}\nObjetivo: ${objective}`
  });
  const raw = response.output_text.trim().replace(/^\`\`\`json/i, "").replace(/\`\`\`$/i, "").trim();
  const parsed = JSON.parse(raw);
  return {
    caption: String(parsed.caption || topic),
    imagePrompt: String(parsed.imagePrompt || `Premium vertical 4:5 advertising image for ${env.BRAND_NAME}, clean modern streaming entertainment concept, elegant lighting, minimal composition, no third-party logos, no excessive text`)
  };
}

export async function imageAgent(prompt: string) {
  const ai = requireClient();
  const result: any = await (ai.images.generate as any)({
    model: env.OPENAI_IMAGE_MODEL,
    prompt,
    size: "1024x1536",
    quality: "medium",
    output_format: "jpeg"
  });

  const b64 = result?.data?.[0]?.b64_json;
  if (!b64) throw new Error("A geração de imagem não retornou bytes");
  return Buffer.from(b64, "base64");
}
