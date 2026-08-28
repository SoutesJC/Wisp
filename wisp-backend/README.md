# wisp-backend

Pipeline que gera um vídeo curto vertical por dia a partir de um assunto: roteiro
estruturado (Narrador + Wisp) → narração + imagens geradas por IA → renderização
com Remotion. Plano técnico completo: [`docs/wisp-plano-tecnico.md`](docs/wisp-plano-tecnico.md).

Este é o resultado das **Fases 0 e 1**: estrutura do projeto rodando, e o
gerador de roteiro (`POST /roteiro/gerar`) funcionando via Claude API. Ainda
sem imagem/áudio/render — isso entra nas Fases 2–5.

## Setup

```bash
npm install          # também roda `prisma generate` (script postinstall)
cp .env.example .env # preencher as chaves reais
```

Preencher no `.env`:
- `ANTHROPIC_API_KEY` — roteiro (Fase 1, **necessário pra testar isso agora**)
- `ELEVENLABS_API_KEY` + os dois `ELEVENLABS_VOICE_ID_*` — narração (Fase 2)
- `IMAGE_GEN_API_KEY` — geração de imagem (Fase 3, provedor ainda a confirmar)
- `REDIS_URL` — precisa de um Redis rodando localmente pra fila (BullMQ)

Depois:

```bash
npx prisma migrate dev --name init   # cria o SQLite local a partir do schema
npm run start:dev
```

## Testando o gerador de roteiro (Fase 1)

Com o servidor rodando, exemplo no modo mais simples (só o assunto):

```bash
curl -X POST http://localhost:3000/roteiro/gerar \
  -H "Content-Type: application/json" \
  -d '{"modo":"so_assunto","idioma":"pt-BR","assunto":"um cachorro que perdeu a bola no parque"}'
```

No PowerShell (Windows), `curl` é um apelido pra `Invoke-WebRequest`, que não
aceita `-X`/`-H`/`-d` — usa isso no lugar:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/roteiro/gerar" -Method Post -ContentType "application/json" -Body '{"modo":"so_assunto","idioma":"pt-BR","assunto":"um cachorro que perdeu a bola no parque"}'
```

Devolve `{ jobId, roteiro }`. Pra rever depois (Pausa 1, seção 3.1 do plano):

```bash
curl http://localhost:3000/roteiro/<jobId>
```
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/roteiro/<jobId>"
```

Os outros dois modos (`assunto_mais_ganchos`, `roteiro_completo`) aceitam os
campos `ganchos`/`roteiroCompleto` no corpo — ver `src/roteiro/dto/gerar-roteiro.dto.ts`
pro formato exato.

**Isso não foi testado com uma chave real** (esse ambiente não tem acesso a
credenciais). O que foi validado sem precisar de chave: a lógica de
validação de estrutura e montagem de ids tem testes unitários passando
(`npx jest roteiro.schema.spec.ts`). O que só se confirma rodando de
verdade: se a chamada à API funciona ponta a ponta, e se a qualidade dos
roteiros gerados está boa — me manda o resultado (sucesso ou erro) que a
gente ajusta.

## Sobre o bloqueio de install scripts do npm 12

O npm 12 passou a bloquear script de instalação (`preinstall`/`install`/`postinstall`)
de qualquer dependência não listada em `allowScripts` no `package.json` — é uma
proteção contra supply-chain attack (pacote malicioso rodando código na sua
máquina só por ter sido instalado). Já deixei os 5 pacotes que legitimamente
precisam disso pré-aprovados no `package.json`:

- `better-sqlite3` — compila/baixa o binário nativo do SQLite. **Sem isso, o
  banco não funciona** — é o mais crítico dos 5.
- `@prisma/engines` e `prisma` — setup do próprio Prisma.
- `msgpackr-extract` — binário nativo opcional (usado por dependências do
  Redis/BullMQ), degrada pra JS puro se não rodar, não é crítico.
- `unrs-resolver` — resolvedor nativo usado pelo ESLint, só afeta o lint.

Se você já rodou `npm install` **antes** dessa correção (ou seja, viu o aviso
`install scripts blocked`), o `package.json` novo sozinho não conserta o que
já foi pulado — roda:

```bash
npm install-scripts approve @prisma/engines better-sqlite3 msgpackr-extract prisma unrs-resolver
npm rebuild
```

Numa instalação nova a partir desse `package.json` já atualizado, isso nem
aparece.

## Sobre o Prisma 7

Esse projeto usa Prisma 7 com o generator novo (`prisma-client`, não o
`prisma-client-js` antigo — esse está descontinuado a partir da v7). O que já
está configurado:

- A URL do banco não fica mais em `schema.prisma`, e sim em
  **`prisma.config.ts`** (raiz do projeto) — usa `process.env.DATABASE_URL`
  com um valor padrão embutido (não o helper `env()`), porque todo comando
  do Prisma CLI carrega esse arquivo, inclusive `generate`, que não precisa
  de um banco real — sem esse fallback, `npm install` falharia num clone
  novo antes mesmo de existir um `.env`.
- O `PrismaClient` exige um driver adapter (aqui, `@prisma/adapter-better-sqlite3`,
  em `src/common/prisma.service.ts`).
- O generator novo gera o client em `src/generated/prisma/` (pasta
  git-ignorada, recriada a cada `prisma generate`), não mais dentro de
  `node_modules`. Ele roda em ESM por padrão, o que quebra com o CommonJS do
  NestJS — por isso `moduleFormat = "cjs"` no `generator client` do
  `schema.prisma`.

Nada disso precisa de ajuste manual, só documentando pra não estranhar se for
mexer nesses arquivos depois.

O Prisma baixa um binário de engine na primeira geração do client. Esse
projeto foi montado num ambiente sandboxed sem acesso a `binaries.prisma.sh`,
então não foi possível confirmar aqui que `prisma generate`/`migrate` rodam
até o fim — mas a validação da configuração (schema + `prisma.config.ts`)
passou sem erro antes de esbarrar nesse bloqueio de rede específico do
sandbox, então o problema era só isso, não a sintaxe. O script `postinstall`
roda `prisma generate` automaticamente no seu `npm install`, sem esse
bloqueio.

## Estrutura

```
src/
├── roteiro/       # geração do roteiro estruturado (Claude API) — Fase 1
├── image-gen/      # interface ImageGenerator + implementações por provedor — Fase 3
├── tts/             # interface TextToSpeech + implementações (Narrador/Wisp) — Fase 2
├── render/           # composições Remotion + trigger de render — Fase 3.5/4
├── storage/           # abstração local disk / S3-compatible
├── pipeline/           # orquestrador — Fase 5
├── queue/               # processors do BullMQ — Fase 5
└── common/               # tipos compartilhados (Roteiro) + PrismaService

prisma/schema.prisma  # modelos Job e ItemGerado
src/generated/prisma/  # client do Prisma, recriado por `prisma generate` (git-ignorado)
remotion/              # ainda vazio — Fase 3.5/4
storage/                # mídia gerada por job (git-ignorado)
```

Cada generator (`image-gen`, `tts`) é definido só como **interface** por enquanto
(`*.interface.ts`) — implementações concretas por provedor entram nas Fases 2 e 3,
sem precisar tocar no resto do pipeline pra trocar de provedor depois.
