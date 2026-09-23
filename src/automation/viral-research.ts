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
      "Conteúdo de entretenimento precisa ser entendido visualmente antes de a pessoa ler a legenda.",
      "Momentos de futebol, cinema em casa, maratona e escolha do que assistir oferecem identificação rápida.",
      "Curiosidade, movimento e emoção positiva tendem a criar uma primeira impressão mais compartilhável do que dramatização de sofrimento.",
      "Alternar formatos e cenários evita fadiga visual e ajuda a descobrir o que a própria audiência responde melhor."
    ],
    hookPatterns: [
      "Pergunta curta de escolha ou curiosidade.",
      "Momento de expectativa antes de jogo, filme ou maratona.",
      "Cena aspiracional com uma transformação do ambiente em experiência de entretenimento.",
      "Humor leve, surpresa ou identificação positiva sem prometer desempenho."
    ],
    visualPatterns: [
      "Sala cinematográfica com pessoas animadas diante da TV.",
      "Torcida ou amigos em clima de jogo, sem marcas de terceiros.",
      "Pessoa escolhendo conteúdo entre TV e celular em ambiente premium.",
      "Composição de alto contraste com ação clara, poucos elementos e CTA forte."
    ],
    angles: [
      "Hoje tem jogo. Sua tela está pronta?",
      "Seu sofá virou cinema.",
      "Filme, série ou futebol: qual vai ser hoje?",
      "Dê play no seu momento."
    ],
    avoid: ["homem sofrendo", "pessoa triste ou desesperada", "antes triste e depois feliz", "promessa de zero travamento", "cópia de criativo alheio", "inglês visível", "texto longo"],
    summary: "Priorize desejo, entretenimento, curiosidade e emoção positiva; use a dor apenas como contexto verbal quando realmente ajudar o gancho."
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
Pesquise sinais ATUAIS dos últimos 30 dias no Brasil sobre entretenimento, streaming, TV, filmes, séries, futebol ao vivo, descoberta de conteúdo e comportamento de audiência.
Use somente conteúdo público. Extraia MECANISMOS, não copie posts, slogans ou criativos.
Não invente métricas. Não trate muita visualização isolada como prova de fórmula.
Busque principalmente: ganchos que param o scroll, curiosidade, emoção positiva, formatos visuais, retenção, humor/identificação, elementos compartilháveis, comentários e sinais da própria audiência.
Problemas como travamento, delay e suporte podem entrar apenas como contexto quando forem relevantes; NÃO recomende cenas de sofrimento, desespero, raiva ou comparação triste x feliz.
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
