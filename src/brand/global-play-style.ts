export const GLOBAL_PLAY_CREATIVE_DNA = `
MARCA: Global Play
INSTAGRAM: @globalplay_streaming
SITE: https://globalplay.fun
WHATSAPP: (21) 96481-6185

OBJETIVO
- KPI principal: aumentar seguidores qualificados no Instagram.
- Criar conteúdo que pare o scroll, gere curiosidade, compartilhamentos, salvamentos e visitas ao perfil.
- Dar um motivo claro para a pessoa seguir @globalplay_streaming e voltar para acompanhar os próximos conteúdos.
- Venda direta, preço e oportunidade comercial são secundários nas postagens de rotina.

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
- Comunidade: perguntas, opinião, descoberta, listas, séries e conteúdos que as pessoas queiram enviar para amigos.
- Oferta: usar com baixa frequência; nunca transformar a rotina do perfil em tabela de preços.
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
- CTA visual padrão: "SIGA @GLOBALPLAY_STREAMING".
- Nome da marca visível: "GLOBAL PLAY".

CLIENTE FINAL
- Trabalhar primeiro desejo, entretenimento, descoberta, conveniência e emoção.
- Dor pode aparecer em uma frase curta de contexto, mas nunca como personagem sofrendo ou comparação triste/feliz.
- Preço não é foco nas postagens automáticas. Quando houver campanha comercial manual, usar apenas valores confirmados:
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
- CTA principal em TODA legenda automática: seguir @globalplay_streaming.
- Alternar CTA secundário entre salvar e compartilhar, sem pedir várias ações ao mesmo tempo.
- Não usar preço ou "QUERO" como foco de toda postagem; isso reduz o caráter editorial do perfil.
- Sempre usar hashtags relevantes; no máximo 5, sem parede de hashtags.

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
export const GLOBAL_PLAY_COMMENT_CTA = "Siga @globalplay_streaming para acompanhar os próximos conteúdos.";

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
DIA DE CONTEUDO PARA REVENDEDORES
- Crie conteúdo útil, curioso ou compartilhável para quem trabalha com revenda e atendimento.
- KPI principal: novos seguidores qualificados, não venda imediata.
- Priorize dicas, erros comuns, bastidores, organização, suporte e profissionalismo.
- Não exiba tabela de preços nas postagens automáticas.
- Feche com motivo natural para seguir @globalplay_streaming.
`;

export const RESELLER_PRICE_BLOCK = `PAINEL ADM — R$ 599,99 — abre painel ULTRA e tem créditos infinitos.
PAINEL ULTRA — R$ 199,00 — cria painel MASTER e tem créditos infinitos.
PAINEL MASTER — R$ 44,99 — cria revenda, mínimo de 10 créditos.`;

export const CUSTOMER_CAMPAIGN_BRIEF = `
DIA DE CONTEUDO PARA PUBLICO FINAL
- Crie entretenimento, curiosidade, descoberta, futebol, filmes e séries com alto potencial de compartilhamento.
- KPI principal: novos seguidores qualificados, salvamentos e visitas ao perfil.
- Evite tabela de preços nas postagens automáticas.
- Use formatos recorrentes que criem expectativa pelo próximo post.
- Feche com motivo natural para seguir @globalplay_streaming.
`;

export const CUSTOMER_PRICE_BLOCK = `1 MÊS — R$ 29,99.
2 MESES — R$ 49,99.
3 MESES — R$ 69,99.`;
