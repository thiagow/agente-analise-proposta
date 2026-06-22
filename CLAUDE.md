# CLAUDE.md — Agente de Análise de Proposta

## O que é este projeto

Sistema de qualificação de leads via IA conversacional da **Tech Hive**. O lead preenche um formulário, opcionalmente sobe um briefing PDF, e conversa com um agente inteligente que coleta informações estruturadas sobre o projeto. O resultado é um JSON de qualificação que o time usa para montar a proposta comercial.

Há quatro tipos de projeto suportados: `webApp`, `mobileApp`, `automacao`, `agente`. O agente adapta perguntas, prompts e schemas de coleta de acordo com o tipo.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| UI | React 18 + Tailwind CSS |
| ORM | Drizzle ORM |
| Banco | PostgreSQL (remoto, EasyPanel) |
| IA | Multi-provider: OpenRouter / Groq / OpenAI |
| PDF | unpdf |
| Auth | JWT (jose, HS256), HttpOnly cookies |
| Deploy | Netlify + @netlify/plugin-nextjs |
| Scripts | tsx com `--env-file=.env` |

---

## Estrutura

```
app/
  api/
    leads/          POST — cria lead + processa PDF
    chat/           POST — turn de qualificação (core)
    brief-prd/      POST — gera Brief PRD a partir do histórico
    auth/           POST login/logout admin
    admin/          GET leads, GET detalhe, GET/POST prompts
  formulario/       Formulário inicial do lead
  chat/[leadId]/    Chat interativo
  admin/            Dashboard + login

lib/
  db/
    schema.ts       Tabelas Drizzle ORM
    index.ts        Conexão PostgreSQL (max:1, serverless)
  openrouter.ts     Abstração multi-provider de IA
  pdf.ts            Extração de texto de PDF
  analise-pdf.ts    Análise estruturada de briefing PDF
  prompts.ts        Prompts de sistema (4 tipos + gerarBriefPRD)
  tools.ts          Tool calling schemas (submit_qualified_lead + analyze_briefing)
  utils.ts          cn() helper

scripts/
  clear-leads.ts    Limpa todos os leads (com confirmação interativa)
```

---

## Banco de dados

### Tabelas

| Tabela | Responsabilidade |
|--------|-----------------|
| `leads` | Entidade central — dados do lead, tipo de projeto, JSON qualificação, análise do documento |
| `mensagens` | Histórico da conversa (role: user \| assistant) |
| `arquivos` | PDF enviado + texto extraído |
| `propostas` | Brief PRD gerado |
| `prompts` | Prompts customizáveis por tipo (substitui padrão em `lib/prompts.ts`) |

Todas as tabelas filhas têm `onDelete: "cascade"` em `leadId`. Deletar um lead limpa tudo.

### Comandos

```bash
npm run db:push       # Sincroniza schema sem migration (dev)
npm run db:generate   # Gera arquivos de migration
npm run db:migrate    # Executa migrations
npm run db:studio     # GUI Drizzle Studio
npm run db:clear-leads # Deleta TODOS os leads (irreversível, pede confirmação)
```

Scripts TypeScript precisam de `--env-file=.env` para carregar variáveis. O npm script já inclui isso.

---

## Variáveis de ambiente

```bash
DATABASE_URL=postgresql://user:pass@host:port/db

AI_PROVIDER=openrouter|groq|openai   # default: openrouter
AI_MODEL=gpt-4o-mini                 # override do modelo padrão
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...

ADMIN_EMAIL=admin@techhive.com.br
ADMIN_PASSWORD_B64=...               # base64 da senha: node -e "console.log(Buffer.from('senha').toString('base64'))"
SESSION_SECRET=...                   # mínimo 32 chars (HS256)

NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## Fluxo principal

```
Formulário → POST /api/leads
  ├─ Cria lead no banco
  ├─ Se PDF: extrai texto (unpdf)
  ├─ Se texto: analisa com IA (analisarBriefing)
  │   ├─ Classifica tipo de projeto
  │   ├─ Extrai campos_identificados
  │   ├─ Identifica gaps (perguntas que faltam)
  │   └─ Salva analiseDocumento + insere abertura contextual como 1ª mensagem
  └─ Retorna leadId → redireciona para /chat/[leadId]

Chat → POST /api/chat (por turn)
  ├─ Busca lead, histórico, system prompt (DB ou padrão)
  ├─ Se analiseDocumento: injeta contexto estruturado (pula perguntas já respondidas)
  ├─ Chama modelo de IA
  ├─ 4 camadas de detecção de encerramento:
  │   A — tool call submit_qualified_lead (oficial)
  │   B — JSON emitido em texto (fallback parser)
  │   C — Padrão textual de despedida (heurística)
  │   D — Segundo chamado forçando tool call (recuperação)
  ├─ Salva mensagens
  └─ Se encerrada: seta leads.encerrada + salva jsonQualificacao

Admin → /api/admin/leads
  ├─ Lista leads com metadados
  ├─ Detalhe por leadId
  └─ POST /api/brief-prd → gera Brief PRD e salva em propostas
```

---

## Lógica crítica: `/api/chat`

O arquivo [app/api/chat/route.ts](app/api/chat/route.ts) é o coração do sistema. Pontos importantes:

- **System prompt dinâmico**: Busca primeiro no banco (tabela `prompts`), fallback para `SYSTEM_PROMPTS` em `lib/prompts.ts`.
- **Contexto de análise prévia**: Se `lead.analiseDocumento` existe, injeta como system message extra instruindo o modelo a pular campos já identificados e focar nos gaps.
- **Abertura não é enviada pelo chat**: A mensagem de abertura é inserida diretamente no banco por `/api/leads` — o chat já começa com ela no histórico.
- **Sanitização de conteúdo** (`sanitizeAssistantContent`): Limpa JSON que o modelo possa ter emitido em texto antes de salvar no banco.
- **Encerramento em cascata**: Quatro mecanismos independentes garantem que a qualificação seja coletada mesmo se o modelo violar as instruções.

---

## Lógica crítica: `lib/tools.ts`

Quatro schemas distintos para `submit_qualified_lead` — um por tipo de projeto. Campos variam significativamente:
- `webApp`: area_logada, painel_admin, integracoes, modelo_uso, volume_usuarios
- `mobileApp`: plataforma, offline, recursos_nativos, publicacao_lojas
- `automacao`: gatilho, sistemas, tem_leitura_ia, frequencia, horas_manuais_semana
- `agente`: canal, base_conhecimento, tipo_interacao, fallback, volume_conversas

Tool separada (`ANALYZE_BRIEFING_TOOL`) usada exclusivamente em `analisarBriefing()` — não aparece no chat.

---

## Lógica crítica: `lib/openrouter.ts`

- `chatCompletionRich()` retorna `{ content, toolCall }` — use sempre que precisar de tool calling.
- `forceTool` força a tool a ser chamada (tool_choice: "function").
- Retry automático em HTTP 429 (espera até 8s).
- Multi-model fallback: `AI_MODELS=model1,model2` — tenta em sequência se o primeiro falhar.

---

## Padrões e convenções

- **Componentes server por padrão** — `"use client"` apenas quando necessário (chat, formulário, admin).
- **Sem comentários óbvios** — Código autodocumentado. Comentários apenas em lógica não-óbvia.
- **Falha graciosa** — Toda integração com IA tem try/catch com fallback comportamental.
- **Português brasileiro** — Todo texto voltado ao lead está em pt-BR. Código e variáveis em inglês.
- **Markdown no chat** — Respostas do assistente são renderizadas com `react-markdown` + `rehype-sanitize`.
- **Prompts no banco** — Prompts customizados sobrescrevem os padrões de `lib/prompts.ts` sem redeploy.

---

## Segurança

- Rotas `/admin/*` protegidas por middleware JWT (`middleware.ts`).
- Cookie `admin_session`: HttpOnly, Secure, SameSite=Lax, 8h.
- Headers de segurança configurados no `netlify.toml`: X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- PDF validado por content-type antes de processar.
- Senha admin em Base64 na env var — não hardcoded.

---

## Deploy

Netlify com plugin Next.js. Build e deploy automático. Variáveis de ambiente configuradas no painel Netlify.

```bash
npm run build   # Build local para verificar antes de pushear
```
