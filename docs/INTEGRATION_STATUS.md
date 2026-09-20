# Integração do manual — 20/09/2026

## Implementado e verificável localmente
- O runtime lê as regras gerais e /ig-dm do manual principal e config/voice.md.
- A marca de atendimento é Global Play; foco em assinantes.
- Pedidos de teste entregam o WhatsApp 5521964816185 antes de qualificação.
- A mensagem inicial não atribui ao usuário uma palavra que ele não comentou.
- Contato humano usa um link concreto, sem alegar transferência concluída.
- Falta de chave ou falha da IA entrega contato em vez de interromper a resposta.
- A mensagem atual entra apenas uma vez no contexto da IA.
- Docker inclui manual e perfil de voz. Dependências fixadas via package-lock.json.

## Diagnóstico Railway
Foram observados dois projetos com serviço claire em FAILED:
- joyful-mindfulness: tentativa de 14/09 falhou ao instalar Zod 4 com OpenAI 5.
  A main atual já usa Zod 3. O serviço não expôs nomes de variáveis de aplicação.
  Há sete alterações pendentes no ambiente, não aplicadas nesta revisão.
- lively-enthusiasm: DATABASE_URL aparece nos nomes das variáveis; não aparecem
  configurações de Meta nem OpenAI. Valores não foram acessados.

## Necessário antes de ativar
Escolher um único serviço Railway para evitar respostas duplicadas e confirmar
suas alterações pendentes antes de publicá-las. Configurar pelo painel seguro:
DATABASE_URL, META_APP_SECRET, META_VERIFY_TOKEN, INSTAGRAM_ACCESS_TOKEN,
INSTAGRAM_ACCOUNT_ID e, para respostas com IA, OPENAI_API_KEY e OPENAI_MODEL
com modelo realmente disponível na conta. Não publicar tokens no GitHub/chat.
O campo HUMAN_HANDOFF_URL é um webhook POST de integração, não um link wa.me.
O WhatsApp público está definido em src/claire/persona.ts e config/voice.md.

Depois: publicar a versão, executar migrações, verificar /health, configurar o
webhook Meta e validar assinatura e resposta com uma conta de teste autorizada.
Não houve teste real de Meta, IA, PostgreSQL nem envio de mensagem nesta revisão.

## Limites existentes
Os outros 12 modos continuam como instruções do manual, sem execução agendada.
Não há pesquisa web, geração de mídia, publicação nem auditoria automática.
O webhook atual confirma recebimento antes de terminar processamento, e marca
eventos antes de enviar. Falhas posteriores podem perder eventos; implementar
fila durável, retentativas controladas e monitoramento antes de prometer operação
24/7. O estado de atendimento humano também precisa de fluxo de retomada.
