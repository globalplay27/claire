export type LeadTemperature = "cold" | "warm" | "hot";

const hotPatterns = [
  /como (eu )?(faço|faco) para (assinar|contratar)/i,
  /quero (assinar|contratar|comprar)/i,
  /como (pago|pagar)/i,
  /forma(s)? de pagamento/i,
  /manda(r)? (o )?pix/i,
  /onde (eu )?pago/i
];

const warmPatterns = [
  /quanto custa/i,
  /qual (o )?valor/i,
  /preço|preco/i,
  /plano/i,
  /quantas telas/i,
  /teste/i,
  /tenho interesse/i
];

const humanPatterns = [
  /quero falar com (uma pessoa|algu[eé]m|atendente)/i,
  /atendente humano/i,
  /reembolso/i,
  /cobrança|cobranca/i,
  /erro de login/i,
  /fora do ar/i,
  /não funciona|nao funciona/i
];

export function classifyLead(text: string): {
  temperature: LeadTemperature;
  needsHuman: boolean;
} {
  const needsHuman = humanPatterns.some((pattern) => pattern.test(text));
  const isHot = hotPatterns.some((pattern) => pattern.test(text));
  const isWarm = warmPatterns.some((pattern) => pattern.test(text));

  if (needsHuman || isHot) return { temperature: "hot", needsHuman: true };
  if (isWarm) return { temperature: "warm", needsHuman: false };
  return { temperature: "cold", needsHuman: false };
}

export function hottest(a: LeadTemperature, b: LeadTemperature): LeadTemperature {
  const rank: Record<LeadTemperature, number> = { cold: 0, warm: 1, hot: 2 };
  return rank[b] > rank[a] ? b : a;
}
