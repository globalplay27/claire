export const GLOBAL_PLAY_CREATIVE_DNA = `
MARCA: Global Play
INSTAGRAM: @globalplay_streaming
SITE: https://globalplay.fun
WHATSAPP: (21) 96481-6185

OBJETIVO
- Criar conteúdo que faça o público se identificar com uma dor real, entender a solução em segundos e visitar o site.
- Crescer visualizações, seguidores e clientes sem prometer viralização nem inventar resultados.

DORES CENTRAIS — TODO CRIATIVO DE CONVERSÃO DEVE PARTIR DE UMA DELAS
1. Aplicativo/streaming travando justamente em dia de jogo ou na hora do gol.
2. Delay alto e receber spoiler do gol antes da imagem chegar.
3. Suporte que não responde quando o cliente precisa.
4. Filme ou série travando na melhor parte.
5. Pouco conteúdo e sensação de pagar por algo que não entrega variedade.
6. Para revendedores: fornecedor instável, suporte que some e cliente cobrando.

GANCHOS PREFERIDOS — CURTOS E POPULARES
- "Vai travar justo na hora do gol?"
- "Cansado de chamar o suporte e ninguém responder?"
- "Filme travando na melhor parte?"
- "Seu streaming te deixa na mão quando você mais precisa?"
- "Chega de passar raiva na frente da TV."
- "Você paga pra assistir ou pra esperar carregar?"

IDENTIDADE VISUAL OBRIGATÓRIA
- Estética brasileira de anúncio premium, forte, comercial e cinematográfica.
- Visual realista, moderno, com acabamento de alto nível.
- Azul elétrico, vermelho, prata/cromado, preto e branco.
- Contraste alto, luz cinematográfica, neon controlado e profundidade.
- Títulos grandes, 3D/alto-relevo, muito legíveis no celular.
- Pessoas reais, sala de TV, estádio, TV grande e situações que mostrem a dor.
- Layout em blocos claros; impactante sem virar bagunça.
- NÃO fazer arte minimalista genérica, cards corporativos ou muito espaço vazio.
- NÃO usar inglês visível.
- NÃO inventar marcas, canais, clubes, filmes ou personagens de terceiros.
- Todo texto visível na arte deve estar em PORTUGUÊS BRASILEIRO.
- Se a arte tiver palavra em inglês, texto ilegível ou aparência genérica, ela deve ser REPROVADA.

PADRÃO DE TEXTO DA ARTE
- Uma headline de no máximo 7 palavras.
- Uma linha de apoio de no máximo 12 palavras.
- Um CTA curto.
- Não colocar parágrafos na imagem.
- CTA visual padrão: "ACESSE GLOBALPLAY.FUN".
- Nome da marca visível: "GLOBAL PLAY".

CLIENTE FINAL
- Trabalhar primeiro a dor: travamento, delay, suporte ou conteúdo.
- Depois mostrar solução visual: tranquilidade, entretenimento, TV/filmes/séries.
- Quando usar preço, usar apenas valores confirmados:
  • 1 MÊS — R$ 29,99
  • 2 MESES — R$ 49,99
  • 3 MESES — R$ 69,99

REVENDEDOR
- Dor: instabilidade, fornecedor que some, suporte ruim, cliente cobrando.
- Solução: estabilidade, suporte e oportunidade comercial.
- Nunca prometer lucro garantido.

ESPORTES
- Estádio/TV com jogo genérico, sem escudos nem marcas quando não houver dados confirmados.
- Explorar a tensão de "travar na hora do gol" e "spoiler do vizinho".
- Painel limpo, título forte e leitura instantânea.

LEGENDA
- Português brasileiro simples.
- Primeira linha forte.
- No máximo 3 frases curtas antes das hashtags.
- Uma única ideia por post.
- Evitar linguagem corporativa como "avalie seu objetivo", "perfil de utilização", "condições disponíveis".
- CTA obrigatório em TODA legenda: "Digite \"QUERO\" nos comentários para saber mais."
- O CTA deve pedir comentário público com QUERO; não pedir a palavra no Direct.
- O site e o WhatsApp serão oferecidos pela Claire em botões clicáveis após o comentário.
- Sempre usar hashtags relevantes; sem parede de hashtags.

REGRA DE QUALIDADE
- A arte precisa ser entendida em até 2 segundos no celular.
- Precisa parecer anúncio profissional da Global Play, não rascunho de IA.
- Se houver inglês, texto aleatório, tipografia quebrada, visual genérico ou baixa legibilidade: reprovar e gerar novamente.
`;

export const GLOBAL_PLAY_DEFAULT_HASHTAGS = [
  "#GlobalPlay",
  "#Streaming",
  "#TVAoVivo",
  "#FilmesESeries",
  "#Entretenimento",
  "#Futebol",
  "#DiversaoEmCasa",
  "#Brasil"
];

export const GLOBAL_PLAY_SITE_CTA = "Conheça os planos em globalplay.fun";
export const GLOBAL_PLAY_COMMENT_CTA = 'Digite "QUERO" nos comentários para saber mais.';

const RESELLER_CAMPAIGN_ANCHOR_DAY = "2026-09-22";

function saoPauloDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function isResellerCampaignDay(date = new Date()) {
  const current = Date.parse(`${saoPauloDayKey(date)}T00:00:00Z`);
  const anchor = Date.parse(`${RESELLER_CAMPAIGN_ANCHOR_DAY}T00:00:00Z`);
  const elapsedDays = Math.floor((current - anchor) / 86_400_000);
  return ((elapsedDays % 2) + 2) % 2 === 0;
}

export function isCustomerCampaignDay(date = new Date()) {
  return !isResellerCampaignDay(date);
}

export const RESELLER_CAMPAIGN_BRIEF = `
REGRA OBRIGATORIA PARA O DIA DE REVENDEDORES
- Produza somente propaganda para REVENDEDORES da Global Play.
- Divulgue a tabela completa, sem omitir nenhum plano:
  • ADM — R$ 599,99: abre painel ULTRA e tem creditos infinitos.
  • ULTRA — R$ 199,00: cria painel MASTER e tem creditos infinitos.
  • MASTER — R$ 44,99: cria revenda, com minimo de 10 creditos.
- Trabalhe a dor de fornecedor instavel, suporte que some, travamentos e clientes cobrando.
- Apresente estabilidade, suporte e oportunidade comercial, sem prometer lucro garantido.
- Nao divulgue planos de cliente final neste dia.
`;

export const RESELLER_PRICE_BLOCK = `PAINEL ADM — R$ 599,99 — abre painel ULTRA e tem créditos infinitos.
PAINEL ULTRA — R$ 199,00 — cria painel MASTER e tem créditos infinitos.
PAINEL MASTER — R$ 44,99 — cria revenda, mínimo de 10 créditos.`;

export const CUSTOMER_CAMPAIGN_BRIEF = `
REGRA OBRIGATORIA PARA O DIA DE CLIENTE FINAL
- Produza somente propaganda para CLIENTES FINAIS da Global Play.
- Divulgue a tabela completa, sem omitir nenhum plano:
  • 1 MES — R$ 29,99.
  • 2 MESES — R$ 49,99.
  • 3 MESES — R$ 69,99.
- Trabalhe as dores de travamentos em jogos, filmes e series, delay, pouco conteudo e suporte que nao responde.
- Apresente estabilidade, variedade de conteudo e suporte, sem prometer zero travamentos.
- Nao divulgue paineis de revenda neste dia.
`;

export const CUSTOMER_PRICE_BLOCK = `1 MÊS — R$ 29,99.
2 MESES — R$ 49,99.
3 MESES — R$ 69,99.`;
