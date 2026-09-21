import OpenAI from "openai";
import { env } from "../config/env.js";
import { GLOBAL_PLAY_CREATIVE_DNA, GLOBAL_PLAY_DEFAULT_HASHTAGS, GLOBAL_PLAY_SITE_CTA } from "../brand/global-play-style.js";
import type { ViralResearch } from "./viral-research.js";
import type { AccountAudit } from "./instagram-insights.js";

const client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

function requireClient() {
  if (!client) throw new Error("OPENAI_API_KEY não configurada");
  return client;
}

function parseJson(text: string): any {
  const raw = text.trim().replace(/^```json/i, "").replace(/```$/i, "").trim();
  return JSON.parse(raw);
}

function cleanHashtags(value: unknown, topic: string) {
  const fromModel = Array.isArray(value)
    ? value.map(String).filter((tag) => /^#[A-Za-zÀ-ÿ0-9_]+$/.test(tag)).slice(0, 8)
    : [];
  const topicTags: string[] = [];
  const lower = topic.toLowerCase();
  if (/futebol|jogo|gol|delay/.test(lower)) topicTags.push("#Futebol", "#FutebolAoVivo");
  if (/filme|série|serie/.test(lower)) topicTags.push("#FilmesESeries");
  if (/revenda|revendedor/.test(lower)) topicTags.push("#Revendedor", "#Empreender");
  const combined = [...fromModel, ...topicTags, ...GLOBAL_PLAY_DEFAULT_HASHTAGS];
  return [...new Set(combined)].slice(0, 8);
}

function finalizeCaption(rawCaption: string, topic: string, hashtags: unknown) {
  const noExistingTags = rawCaption
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n")
    .trim();
  const sentences = noExistingTags.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3);
  let body = sentences.join(" ").trim();
  if (!/globalplay\.fun/i.test(body)) body = `${body}${body ? " " : ""}${GLOBAL_PLAY_SITE_CTA}.`;
  const tags = cleanHashtags(hashtags, topic);
  return `${body}\n\n${tags.join(" ")}`;
}

export async function plannerAgent(research: ViralResearch, audit: AccountAudit) {
  const ai = requireClient();
  const response = await ai.responses.create({
    model: env.OPENAI_MODEL,
    instructions: `Você é o estrategista do Instagram da ${env.BRAND_NAME}.
Use a pesquisa viral atual e os dados da própria conta para escolher UMA ideia de post.
Prioridade absoluta: trabalhar uma dor real do cliente e transformar essa dor em um gancho simples.
Não copie criativos pesquisados. Extraia mecanismo, formato e tensão.
Não prometa que nunca trava, não invente resultados e não use linguagem corporativa.
${GLOBAL_PLAY_CREATIVE_DNA}
Responda JSON puro no formato {"topic":"...","objective":"...","pain":"...","hook":"...","format":"image"}.`,
    input: `PESQUISA VIRAL:\n${JSON.stringify(research)}\n\nAUDITORIA DA CONTA:\n${JSON.stringify(audit)}\n\nEscolha a próxima publicação.`
  } as any);
  const parsed = parseJson(response.output_text);
  return {
    topic: String(parsed.topic || research.angles[0] || "Vai travar justo na hora do gol?"),
    objective: String(parsed.objective || env.BRAND_OBJECTIVE),
    pain: String(parsed.pain || "travamento"),
    hook: String(parsed.hook || research.angles[0] || "Vai travar justo na hora do gol?")
  };
}

export async function creatorAgent(topic: string, objective: string, research: ViralResearch, audit: AccountAudit) {
  const ai = requireClient();
  const response = await ai.responses.create({
    model: env.OPENAI_MODEL,
    instructions: `Você é o diretor criativo da Global Play (${env.BRAND_INSTAGRAM}).
Seu público é brasileiro e lê rápido. O texto tem que ser simples, popular e comercial.
Crie UMA legenda curta e UMA direção visual premium.
REGRAS DE LEGENDA:
- primeira linha forte;
- no máximo 3 frases curtas;
- CTA para globalplay.fun;
- hashtags obrigatórias, 5 a 8;
- não pedir palavra no Direct;
- não usar termos corporativos ou rebuscados.
REGRAS DA ARTE:
- vertical para Instagram;
- visual cinematográfico e realista;
- a cena precisa MOSTRAR a dor;
- headline enorme e muito legível;
- TODO texto visível em português brasileiro;
- proíba qualquer palavra em inglês;
- no máximo headline + apoio + CTA;
- nada de cards corporativos minimalistas;
- nada de logos de terceiros;
- texto exato deve ser curto para reduzir erros tipográficos.
${GLOBAL_PLAY_CREATIVE_DNA}
Responda JSON puro:
{"caption":"...","hashtags":["#..."],"headline":"...","subheadline":"...","imagePrompt":"..."}.
O imagePrompt pode ser escrito em inglês como instrução técnica, MAS deve declarar explicitamente que TODO TEXTO VISÍVEL NA IMAGEM será em português e informar as frases exatas entre aspas.`,
    input: `Tema: ${topic}\nObjetivo: ${objective}\nSinais atuais: ${research.summary}\nGanchos observados: ${research.hookPatterns.join(" | ")}\nPadrões visuais: ${research.visualPatterns.join(" | ")}\nAuditoria própria: ${audit.summary}`
  } as any);
  const parsed = parseJson(response.output_text);
  const headline = String(parsed.headline || topic).slice(0, 70);
  const subheadline = String(parsed.subheadline || "Chega de passar raiva na frente da TV.").slice(0, 100);
  const exactTextRules = ` ALL VISIBLE TEXT MUST BE BRAZILIAN PORTUGUESE. Do not render any English words. Render only these exact text elements: "GLOBAL PLAY", "${headline}", "${subheadline}", "ACESSE GLOBALPLAY.FUN". No other visible text.`;
  const basePrompt = String(parsed.imagePrompt || "Premium cinematic Brazilian streaming advertisement, realistic living room and television, high contrast blue red silver lighting, strong commercial composition.");
  return {
    caption: finalizeCaption(String(parsed.caption || topic), topic, parsed.hashtags),
    imagePrompt: `${basePrompt}\n${exactTextRules}\n${GLOBAL_PLAY_CREATIVE_DNA}`
  };
}

async function auditImageQuality(bytes: Buffer) {
  const ai = requireClient();
  const dataUrl = `data:image/jpeg;base64,${bytes.toString("base64")}`;
  const response = await ai.responses.create({
    model: env.OPENAI_MODEL,
    instructions: `Você é o controle de qualidade visual da Global Play.
Reprove se houver QUALQUER palavra em inglês, texto ilegível ou aleatório, visual corporativo genérico, headline pequena, composição vazia ou aparência amadora.
Aprove somente se for um anúncio premium, forte, legível no celular, em português e coerente com a dor do cliente.
Retorne somente JSON: {"approved":true|false,"issues":["..."],"correction":"..."}.`,
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: "Audite esta arte antes de publicar." },
        { type: "input_image", image_url: dataUrl }
      ]
    }]
  } as any);
  try {
    const parsed = parseJson(response.output_text);
    return { approved: Boolean(parsed.approved), issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [], correction: String(parsed.correction || "") };
  } catch {
    return { approved: false, issues: ["controle de qualidade não retornou JSON válido"], correction: "Simplifique a composição, use apenas português e aumente a legibilidade." };
  }
}

export async function imageAgent(prompt: string) {
  const ai = requireClient();
  let workingPrompt = prompt;
  let lastIssues: string[] = [];

  for (let attempt = 1; attempt <= 3; attempt++) {
    const result: any = await (ai.images.generate as any)({
      model: env.OPENAI_IMAGE_MODEL,
      prompt: workingPrompt,
      size: "1024x1536",
      quality: "high",
      output_format: "jpeg"
    });
    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) throw new Error("A geração de imagem não retornou bytes");
    const bytes = Buffer.from(b64, "base64");
    const qa = await auditImageQuality(bytes);
    if (qa.approved) return bytes;
    lastIssues = qa.issues;
    workingPrompt = `${prompt}\nREGENERATION REQUIRED. Fix these QA problems: ${qa.issues.join("; ")}. Correction: ${qa.correction}. Make the design more premium, more visual, more legible, and strictly Portuguese.`;
  }

  throw new Error(`Criativo reprovado pelo controle de qualidade: ${lastIssues.join("; ")}`);
}
