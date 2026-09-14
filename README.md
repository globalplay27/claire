# Claire Instagram Agent

Agente virtual 24/7 para captar e qualificar leads no Instagram da Global Play.

## Fluxo da V1

1. Pessoa comenta uma palavra-gatilho, por exemplo **QUERO**.
2. A Meta envia o evento para `POST /instagram/webhook`.
3. O agente detecta o gatilho e envia uma resposta privada.
4. Quando o usuário responde no Direct, Claire continua a qualificação.
5. O lead é classificado como `cold`, `warm` ou `hot`.
6. Leads que pedem humano, querem contratar/pagar ou entram em casos sensíveis vão para `human_handoff`.
7. Conversas e leads ficam armazenados no PostgreSQL.

## Stack

- Node.js 22 + TypeScript
- Express
- OpenAI Responses API
- Meta Instagram API / Webhooks (Graph API v26.0 por padrão)
- PostgreSQL
- Docker
- GitHub Actions

## 1. Requisitos Meta

Use uma conta Instagram profissional (Business ou Creator) e um app Meta configurado para Instagram API com Instagram Login. A aplicação precisa, conforme o caso de uso, das permissões para gerenciar mensagens e comentários.

Configure o callback de webhook como:

`https://SEU-DOMINIO/instagram/webhook`

E use em `META_VERIFY_TOKEN` o mesmo token informado na configuração do webhook na Meta.

## 2. Configuração local

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

Teste de saúde:

```bash
curl http://localhost:3000/health
```

## 3. Variáveis obrigatórias

Veja `.env.example`. Nunca faça commit do arquivo `.env` real.

Principais variáveis:

- `OPENAI_API_KEY`
- `META_APP_SECRET`
- `META_VERIFY_TOKEN`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_ACCOUNT_ID`
- `DATABASE_URL`

## 4. Gatilhos

A lista fica em `LEAD_KEYWORDS` no ambiente. Exemplo:

`quero,preço,preco,valor,teste,saiba mais`

## 5. Segurança

- Assinaturas `X-Hub-Signature-256` são verificadas quando `META_APP_SECRET` está configurado.
- Eventos são deduplicados em `processed_events`.
- Tokens e segredos ficam apenas em variáveis de ambiente.
- Claire não solicita senha ou dados completos de cartão.

## 6. Próximas etapas

- Conectar uma conta Meta de teste.
- Confirmar payloads reais de `comments` e `messages` no App Dashboard.
- Definir os planos/preços reais da Global Play.
- Configurar `HUMAN_HANDOFF_URL` para WhatsApp/CRM/automação.
- Hospedar o container em serviço 24/7 e configurar domínio HTTPS.

## Observação importante

A API oficial do Instagram impõe regras de início e continuidade de conversas. Este projeto foi desenhado para responder a interações legítimas iniciadas pelo usuário e não para envio massivo de DMs frias.
