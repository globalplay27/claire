import OpenAI from "openai";
import { env } from "../config/env.js";
import { GLOBAL_PLAY_CREATIVE_DNA } from "../brand/global-play-style.js";
import { addTextUsageCost } from "./nexus-ledger.js";

const client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

export type ViralResearch = {
  signals: string[];
  hookPatterns: string[];
  visualPatterns: string[];
  angles: string[];
  avoid: string[];
  summary: string;
};

function fallbackResearch(): ViralResearch {
  return {
    signals: [
      "Travamento e buffering em transmissões ao vivo geram frustração imediata.",
      "Delay em futebol cria o efeito de receber spoiler do gol antes da TV.",
      "Suporte que demora a responder aumenta a sensação de abandono.",
      "Conteúdo de dor cotidiana funciona melhor quando a situação é reconhecida em segundos."
    ],
    hookPatterns: [
      "Pergunta curta que descreve a dor.",
      "Cena de tensão antes do momento decisivo.",
      "Contraste entre passar raiva e assistir tranquilo.",
      "Humor de identificação sem prometer desempenho."
    ],
    visualPatterns: [
      "Pessoa reagindo à TV travada em jogo decisivo.",
      "Tela carregando no momento do gol.",
      "Família frustrada e depois relaxada diante da TV.",
      "Headline grande, poucos elementos e CTA forte."
    ],
    angles: [
      "Vai travar justo na hora do gol?",
      "Filme travando na melhor parte?",
      "Suporte sumiu quando você precisou?",
      "Você paga pra assistir ou pra esperar carregar?"
    ],
    avoid: ["promessa de zero travamento", "cópia de criativo alheio", "inglês visível", "texto longo"],
    summary: "Priorize identificação imediata com travamento, delay, suporte e conteúdo; use pergunta curta, cena emocional e CTA simples."
  };
}

function parseJson(text: string): any {
  const raw = text.trim().replace(/^```json/i, "").replace(/```$/i, "").trim();
  return JSON.parse(raw);
}

export async function viralResearchAgent(learningMemory = ""): Promise<ViralResearch> {
  if (!client) return fallbackResearch();

  try {
    const response = await client.responses.create({
      model: env.OPENAI_MODEL,
      tools: [{ type: "web_search" } as any],
      instructions: `Você executa o modo /ig-viral para a Global Play.
Pesquise sinais ATUAIS dos últimos 30 dias no Brasil sobre streaming, TV, filmes, séries, futebol ao vivo, buffering/travamento, delay, experiência de suporte e descoberta de conteúdo.
Use somente conteúdo público. Extraia MECANISMOS, não copie posts, slogans ou criativos.
Não invente métricas. Não trate muita visualização isolada como prova de fórmula.
Busque principalmente: dor recorrente, tipo de gancho, formato, mecanismo de retenção, humor/identificação, elementos compartilháveis e comentários.
Não recomende pirataria nem links ilegais.
Compare os sinais atuais com a memória histórica fornecida. Preserve padrões que continuam fortes, descarte padrões fracos e proponha pelo menos um teste novo. Não confunda correlação com garantia de viralização.
${GLOBAL_PLAY_CREATIVE_DNA}
Retorne SOMENTE JSON válido:
{"signals":["..."],"hookPatterns":["..."],"visualPatterns":["..."],"angles":["..."],"avoid":["..."],"summary":"..."}`,
      input: `Pesquise agora o que está chamando atenção neste nicho e transforme em aprendizado para o próximo criativo da Global Play.\n\nMEMÓRIA DE PESQUISAS E RESULTADOS ANTERIORES:\n${learningMemory || "Ainda não há memória histórica suficiente."}`
    } as any);

    const webCalls = Array.isArray((response as any).output)
      ? (response as any).output.filter((item: any) => item?.type === "web_search_call").length
      : 0;
    addTextUsageCost((response as any).usage, env.OPENAI_MODEL, webCalls * 0.01, webCalls ? "openai_usage_plus_web_search" : "openai_usage");
    const parsed = parseJson(response.output_text);
    return {
      signals: Array.isArray(parsed.signals) ? parsed.signals.slice(0, 8).map(String) : [],
      hookPatterns: Array.isArray(parsed.hookPatterns) ? parsed.hookPatterns.slice(0, 8).map(String) : [],
      visualPatterns: Array.isArray(parsed.visualPatterns) ? parsed.visualPatterns.slice(0, 8).map(String) : [],
      angles: Array.isArray(parsed.angles) ? parsed.angles.slice(0, 8).map(String) : [],
      avoid: Array.isArray(parsed.avoid) ? parsed.avoid.slice(0, 8).map(String) : [],
      summary: String(parsed.summary || fallbackResearch().summary)
    };
  } catch (error) {
    console.warn("Pesquisa viral indisponível; usando base estratégica local.", error instanceof Error ? error.message : String(error));
    return fallbackResearch();
  }
}
