import OpenAI from "openai";
import { env } from "../config/env.js";
import { GLOBAL_PLAY_CREATIVE_DNA, GLOBAL_PLAY_DEFAULT_HASHTAGS, GLOBAL_PLAY_SITE_CTA } from "../brand/global-play-style.js";
import { renderGlobalPlayCreative } from "./creative-renderer.js";
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
  const fromModel = Array.isArray(value) ? value.map(String).filter((tag) => /^#[A-Za-zÀ-ÿ0-9_]+$/.test(tag)).slice(0, 8) : [];
  const topicTags: string[] = [];
  const lower = topic.toLowerCase();
  if (/futebol|jogo|gol|delay/.test(lower)) topicTags.push("#Futebol", "#FutebolAoVivo");
  if (/filme|série|serie/.test(lower)) topicTags.push("#FilmesESeries");
  if (/revenda|revendedor/.test(lower)) topicTags.push("#Revendedor", "#Empreender");
  return [...new Set([...fromModel, ...topicTags, ...GLOBAL_PLAY_DEFAULT_HASHTAGS])].slice(0, 8);
}

function finalizeCaption(rawCaption: string, topic: string, hashtags: unknown) {
  const bodyLines = rawCaption.split("\n").filter((line) => !line.trim().startsWith("#")).join(" ").trim();
  const sentences = bodyLines.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3);
  let body = sentences.join(" ").trim();
  if (!/globalplay\.fun/i.test(body)) body = `${body}${body ? " " : ""}${GLOBAL_PLAY_SITE_CTA}.`;
  return `${body}\n\n${cleanHashtags(hashtags, topic).join(" ")}`;
}

export async function plannerAgent(research: ViralResearch, audit: AccountAudit) {
  const ai = requireClient();
  const response = await ai.responses.create({
    model: env.OPENAI_MODEL,
    instructions: `Você é o estrategista do Instagram da ${env.BRAND_NAME}.
Use pesquisa viral atual + dados da própria conta para escolher UMA ideia.
Trabalhe uma dor real do cliente com gancho simples. Não copie; extraia mecanismo, formato e tensão.
Não prometa zero travamentos nem invente resultados.
${GLOBAL_PLAY_CREATIVE_DNA}
Responda JSON puro: {"topic":"...","objective":"...","pain":"...","hook":"...","format":"image"}.`,
    input: `PESQUISA VIRAL:\n${JSON.stringify(research)}\n\nAUDITORIA:\n${JSON.stringify(audit)}\n\nEscolha a próxima publicação.`
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
Crie legenda curta + headline + apoio + descrição de FUNDO VISUAL SEM TEXTO.
Legenda: até 3 frases, CTA para globalplay.fun, 5 a 8 hashtags, sem Direct e sem linguagem corporativa.
Arte: cinematográfica, realista, forte, brasileira, mostrando a dor em 2 segundos.
O imagePrompt deve pedir uma cena SEM QUALQUER TEXTO, LOGO, LETRA, NÚMERO OU INTERFACE LEGÍVEL. A aplicação vai sobrepor o texto depois.
Não use logos de terceiros.
${GLOBAL_PLAY_CREATIVE_DNA}
Responda JSON puro: {"caption":"...","hashtags":["#..."],"headline":"...","subheadline":"...","imagePrompt":"..."}.`,
    input: `Tema: ${topic}\nObjetivo: ${objective}\nSinais atuais: ${research.summary}\nGanchos: ${research.hookPatterns.join(" | ")}\nPadrões visuais: ${research.visualPatterns.join(" | ")}\nAuditoria: ${audit.summary}`
  } as any);
  const parsed = parseJson(response.output_text);
  const headline = String(parsed.headline || topic).slice(0, 60);
  const subheadline = String(parsed.subheadline || "Chega de passar raiva na frente da TV.").slice(0, 90);
  const imagePrompt = `${String(parsed.imagePrompt || "Premium cinematic Brazilian entertainment ad scene.")}\nCreate ONLY the photographic/cinematic background. NO visible text, letters, words, logos, numbers, captions, UI labels, watermarks or readable signage anywhere. Leave clean dark negative space at the top and bottom for later text overlay. ${GLOBAL_PLAY_CREATIVE_DNA}`;
  return {
    caption: finalizeCaption(String(parsed.caption || topic), topic, parsed.hashtags),
    imagePrompt,
    headline,
    subheadline
  };
}

async function auditImageQuality(bytes: Buffer, headline: string, subheadline: string) {
  const ai = requireClient();
  const dataUrl = `data:image/jpeg;base64,${bytes.toString("base64")}`;
  const response = await ai.responses.create({
    model: env.OPENAI_MODEL,
    instructions: `Você é o controle de qualidade visual da Global Play.
IMPORTANTE: "GLOBAL PLAY" é a marca oficial e "GLOBALPLAY.FUN" é o site oficial. Nunca reprove PLAY ou FUN quando aparecem nesses textos oficiais.
Textos permitidos: GLOBAL PLAY; a headline fornecida; a linha de apoio fornecida; ACESSE GLOBALPLAY.FUN.
Reprove se houver qualquer outro texto inesperado, inglês extra, texto ilegível/aleatório, composição amadora, headline pequena, excesso de informação ou visual corporativo genérico.
Aprove somente se parecer anúncio premium, forte e legível no celular.
Retorne apenas JSON: {"approved":true|false,"issues":["..."],"correction":"..."}.`,
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: `Headline esperada: ${headline}\nApoio esperado: ${subheadline}` },
        { type: "input_image", image_url: dataUrl }
      ]
    }]
  } as any);
  try {
    const parsed = parseJson(response.output_text);
    return { approved: Boolean(parsed.approved), issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [], correction: String(parsed.correction || "") };
  } catch {
    return { approved: false, issues: ["controle de qualidade não retornou JSON válido"], correction: "Aumente a legibilidade e simplifique a composição." };
  }
}

export async function imageAgent(prompt: string, headline: string, subheadline: string) {
  const ai = requireClient();
  let lastIssues: string[] = [];
  let workingPrompt = prompt;

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
    const background = Buffer.from(b64, "base64");
    const rendered = await renderGlobalPlayCreative(background, headline, subheadline);
    const qa = await auditImageQuality(rendered, headline, subheadline);
    if (qa.approved) return rendered;
    lastIssues = qa.issues;
    workingPrompt = `${prompt}\nRegenerate the background to fix these visual problems: ${qa.issues.join("; ")}. Keep it text-free, premium, cinematic and leave clean copy space.`;
  }

  throw new Error(`Criativo reprovado pelo controle de qualidade: ${lastIssues.join("; ")}`);
}
