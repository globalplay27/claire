export const GLOBAL_PLAY_CREATIVE_DNA = `
MARCA: Global Play
INSTAGRAM: @globalplay_streaming
SITE: https://globalplay.fun
WHATSAPP: (21) 96481-6185

OBJETIVO
- Criar conteúdo que pare o scroll, gere curiosidade e faça o público desejar a experiência Global Play.
- Aumentar alcance, comentários, compartilhamentos, visitas ao site e oportunidades comerciais sem prometer viralização nem inventar resultados.
- Vender entretenimento e conveniência com comunicação simples, positiva, atual e altamente visual.

DIREÇÃO ESTRATÉGICA — VISIBILIDADE PRIMEIRO
1. Antes de criar, usar pesquisa atual + desempenho da própria conta para escolher o melhor gancho, formato e tema.
2. Priorizar emoção positiva, descoberta, diversão, futebol, noite de cinema, maratona, família/amigos e liberdade de assistir.
3. Dor pode existir como CONTEXTO de copy, mas nunca como estética principal.
4. É PROIBIDO transformar a dor em cena literal de sofrimento: homem triste, pessoa desesperada, rosto de raiva, casal brigando ou comparação "sofrendo x feliz".
5. Evitar repetir o mesmo conceito visual em dias consecutivos; variar cenário, enquadramento e mecanismo de atenção.
6. Cada criativo deve ter UM elemento que prenda atenção em até 2 segundos: ação, expressão de surpresa positiva, luz, movimento, futebol, tela cinematográfica ou composição inesperada.

PILARES DE CONTEÚDO
- Entretenimento aspiracional: clima de cinema, maratona, sofá premium, família/amigos e momentos de diversão.
- Esporte e emoção: expectativa do jogo, comemoração, torcida e tensão positiva do lance.
- Descoberta: "o que assistir hoje?", novidades de gêneros e escolha de conteúdo sem usar marcas de terceiros.
- Conveniência: assistir em TV, celular, tablet ou notebook com cenas naturais.
- Oferta: planos e CTA claros, sem transformar todo post em tabela.
- Revenda: oportunidade, estrutura, autonomia e suporte; nunca mostrar fracasso ou desespero.

GANCHOS PREFERIDOS — CURTOS, POSITIVOS E CURIOSOS
- "Seu sofá virou cinema."
- "Hoje tem jogo. Sua tela está pronta?"
- "Escolher o que assistir ficou mais divertido."
- "Dê play no seu momento."
- "Filme, série ou futebol: qual vai ser hoje?"
- "Uma noite comum pode virar sessão especial."
- "Seu entretenimento merece mais possibilidades."

IDENTIDADE VISUAL OBRIGATÓRIA
- Estética brasileira de anúncio premium, forte, comercial e cinematográfica.
- Visual realista, moderno, com acabamento de alto nível.
- Azul elétrico, vermelho, prata/cromado, preto e branco.
- Contraste alto, luz cinematográfica, neon controlado e profundidade.
- Títulos grandes, 3D/alto-relevo, muito legíveis no celular.
- Pessoas reais ou cenas de entretenimento marcantes, sala de TV, estádio, TV grande, celular e momentos de diversão/descoberta.
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
- Trabalhar primeiro desejo, entretenimento, descoberta, conveniência e emoção.
- Dor pode aparecer em uma frase curta de contexto, mas nunca como personagem sofrendo ou comparação triste/feliz.
- Quando usar preço, usar apenas valores confirmados:
  • 1 MÊS — R$ 29,99
  • 2 MESES — R$ 49,99
  • 3 MESES — R$ 69,99

REVENDEDOR
- Mostrar oportunidade comercial, estrutura, autonomia, suporte e profissionalismo.
- Problemas do mercado podem aparecer na copy, sem cenas de fracasso, desespero ou clientes irritados.
- Nunca prometer lucro garantido.

ESPORTES
- Estádio/TV com jogo genérico, sem escudos nem marcas quando não houver dados confirmados.
- Explorar expectativa, emoção, comemoração e energia de acompanhar o jogo; problemas técnicos podem ser citados apenas como contraste verbal.
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
