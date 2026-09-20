# Claire — automação multiagente

A Claire agora separa responsabilidades em agentes internos:

- **planner**: escolhe o tema e o objetivo da próxima publicação.
- **creator**: cria legenda e direção visual seguindo a voz da Global Play.
- **image**: gera a imagem do post quando `OPENAI_API_KEY` está configurada.
- **publisher**: cria o container de mídia e publica via API oficial do Instagram.
- **engagement**: recebe comentários/DM pelo webhook, detecta leads e conversa com eles.
- **auditor**: reservado para coleta e análise de métricas da conta; não inventa métricas.

## Segurança e aprovação técnica

A automação só roda com `AUTOMATION_ENABLED=true`.

Para atendimento real, configure:
- `META_APP_SECRET`
- `META_VERIFY_TOKEN`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_ACCOUNT_ID`

Para geração automática de conteúdo:
- `OPENAI_API_KEY`

O serviço nunca deve registrar tokens ou segredos nos logs.

## Rotas

- `GET /health` — saúde e prontidão básica.
- `GET /instagram/webhook` — verificação Meta.
- `POST /instagram/webhook` — eventos Meta.
- `GET /automation/status` — estado dos agentes e fila.
- `POST /automation/run` — execução manual autenticada com `AUTOMATION_ADMIN_TOKEN`.
- `GET /automation/assets/:id` — mídia temporariamente pública para a Meta buscar durante a publicação.

## Banco

As migrations são idempotentes e executadas em ordem. Em produção, rode `npm run db:migrate` antes do serviço subir.
