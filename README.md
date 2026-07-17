# 📄 papershare

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-orange.svg)]()

**Papershare** é uma plataforma open source para **upload, compartilhamento e análise de documentos** — pense em algo no espírito do DocSend ou Papermark. Você envia um documento, gera links de compartilhamento configuráveis (senha, expiração, marca d'água, NDA, allow-list de emails, branding) e acompanha em detalhe como cada visitante interage com o conteúdo: tempo por página, taxa de engajamento, quando devolveu, quando baixou.

💡 A camada de IA (resumo automático, chat sobre o documento, insights de analytics, sugestões de e-mail de follow-up) roda no modelo **bring-your-own-key**: cada usuário configura sua própria chave da Anthropic em Configurações, e os recursos de IA rodam contra o crédito dele — sem chave global compartilhada.

---

## 🚀 Tecnologias Utilizadas

- ⚛️ **Next.js 14** – App Router para o frontend, Pages Router (`pages/api/v1`) para a API REST
- 📈 **TypeScript 5** – Tipagem estática de ponta a ponta, `types/index.ts` como fonte única de verdade
- 🐘 **PostgreSQL 16** – Banco relacional, SQL puro (sem ORM), migrações versionadas com `postgres-migrations`
- 🐳 **Docker** – Postgres + MinIO em desenvolvimento local
- 🪣 **S3-compatible storage** – MinIO localmente, AWS S3/Cloudflare R2 em produção
- 🎨 **Tailwind CSS v4 + shadcn/ui** – componentes sobre Radix UI
- 🤖 **Anthropic Claude (Haiku)** – resumo, chat RAG, insights e sugestões, com chave por usuário
- ✉️ **Resend** – e-mail transacional (notificação de nova visualização), no-op silencioso se não configurado
- 🧪 **Jest** – suíte de testes de integração (sobe o servidor real + banco real, sem mocks)
- 🔒 **bcrypt + sessões** – autenticação baseada em sessão (não JWT)
- ▲ **Vercel** – deploy automático via Git

---

## 📂 Estrutura do Projeto

```
📦 papershare/
 ┣ 📂 app/                    # Next.js App Router (frontend)
 ┃ ┣ 📂 dashboard/           # Listagem de documentos do usuário
 ┃ ┣ 📂 documents/[id]/      # Detalhe do documento, links, analytics
 ┃ ┣ 📂 view/[token]/        # Visualizador público (PDF, chat, NDA, etc.)
 ┃ ┣ 📂 settings/            # Perfil, chave de IA, exclusão de conta
 ┃ ┗ 📂 superadmin/          # Painel de migrações (acesso restrito)
 ┣ 📂 pages/api/v1/           # API REST (delivery layer, sem lógica de negócio)
 ┃ ┣ 📂 users/               # Cadastro, perfil, chave de IA
 ┃ ┣ 📂 sessions/            # Login/logout
 ┃ ┣ 📂 documents/           # CRUD de documentos, resumo, analytics, insights
 ┃ ┣ 📂 share/[token]/       # Endpoints públicos do link de compartilhamento
 ┃ ┗ 📂 migrations/          # Executor de migrações via API (superadmin ou secret)
 ┣ 📂 models/                 # Lógica de domínio (funções puras, sem HTTP)
 ┃ ┣ 📄 document.ts, shareLink.ts, linkView.ts, user.ts, ...
 ┃ ┗ 📄 summarizer.ts, chat.ts, analyticsInsights.ts, followupEmail.ts  # IA
 ┣ 📂 infra/                  # Infraestrutura técnica
 ┃ ┣ 📄 database.ts          # Cliente PostgreSQL
 ┃ ┣ 📄 storage.ts           # Cliente S3-compatible (upload/download)
 ┃ ┣ 📄 ai.ts                # Wrapper do cliente Anthropic (chave por chamada)
 ┃ ┣ 📄 encryption.ts        # AES-256-GCM para credenciais reversíveis em repouso
 ┃ ┣ 📄 auth.ts               # Middlewares de sessão e superadmin
 ┃ ┣ 📄 errors.ts             # Classes de erro customizadas
 ┃ ┗ 📂 migrations/           # Migrações SQL puras (`NNN-descricao.sql`)
 ┣ 📂 components/             # Componentes React (documents, share-links, viewer, analytics, IA...)
 ┣ 📂 tests/integration/      # Testes de integração (espelham `pages/api/v1/`)
 ┣ 📂 user-stories/           # Specs por fase/feature
 ┣ 📄 types/index.ts          # Todas as interfaces TypeScript
 ┣ 📄 CLAUDE.md               # Contexto do projeto para desenvolvimento assistido por IA
 ┣ 📄 CHANGELOG.md            # Histórico detalhado de mudanças
 ┗ 📄 TODO.md                 # Roadmap completo, por fase
```

---

## ⚙️ Como Rodar Localmente

### 1. Clone o repositório

```bash
git clone https://github.com/gustavolimav/papershare.git
cd papershare
```

### 2. Configure variáveis de ambiente

Copie `.env.development` (já vem com valores padrão para desenvolvimento local — Postgres, MinIO, pepper de senha e chave de criptografia de exemplo) e ajuste o que precisar. A lista completa de variáveis, com o propósito de cada uma, está documentada na seção "Environment variables" de [`CLAUDE.md`](CLAUDE.md).

Duas exigem atenção especial se você for além do ambiente local:

- `ENCRYPTION_KEY` — nunca troque em produção depois de configurada, ou toda chave de IA já salva por usuários fica impossível de descriptografar.
- `PEPPER` — mesma regra, para hashes de senha.

### 3. Instalar dependências

```bash
npm install
```

### 4. Rodar o projeto

**Com Docker (recomendado):**

```bash
npm run dev  # Sobe Postgres + MinIO, roda migrações pendentes e inicia o Next.js
```

**Ou manualmente:**

```bash
npm run services:up            # Sobe Postgres + MinIO via Docker Compose
npm run services:wait:postgres # Aguarda o banco ficar disponível
npm run migrations:up          # Executa migrações pendentes
next dev                       # Inicia o servidor Next.js
```

A aplicação sobe em `http://localhost:3000`.

---

## 📚 Principais Áreas da API

A API REST vive em `http://localhost:3000/api/v1/`. Alguns pontos de entrada, por área — a lista completa está em [`pages/api/v1/`](pages/api/v1/) (espelhada 1:1 pelos testes em [`tests/integration/api/v1/`](tests/integration/api/v1/)):

| Área                      | Exemplos                                                                                                                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação              | `POST /api/v1/users`, `POST /api/v1/sessions`, `GET /api/v1/sessions`                                                                                                                                                                    |
| Documentos                | `POST/GET /api/v1/documents`, `GET/PATCH/DELETE /api/v1/documents/[id]`                                                                                                                                                                  |
| Links de compartilhamento | `POST/GET /api/v1/documents/[id]/links`, `PATCH/DELETE /api/v1/documents/[id]/links/[linkId]`                                                                                                                                            |
| Acesso público ao link    | `GET /api/v1/share/[token]`, `POST /api/v1/share/[token]/view`, `GET /api/v1/share/[token]/file`                                                                                                                                         |
| Analytics                 | `GET /api/v1/documents/[id]/analytics`, `GET /api/v1/documents/[id]/links/[linkId]/analytics`                                                                                                                                            |
| IA (por usuário)          | `PUT/DELETE /api/v1/users/[username]/ai-key`, `GET/POST /api/v1/documents/[id]/summary`, `GET /api/v1/documents/[id]/analytics/insights`, `POST /api/v1/share/[token]/chat`, `POST /api/v1/documents/[id]/links/[linkId]/followup-email` |
| Operacional               | `GET /api/v1/status`, `GET/POST /api/v1/migrations`                                                                                                                                                                                      |

---

## 🧪 Rodando Testes

Todos os testes são de integração: sobem o servidor Next.js real contra um banco PostgreSQL real (sem mocks). É necessário ter o Docker rodando.

```bash
npm test                    # Sobe Docker, roda migrações, executa toda a suíte
npm run test:watch          # Modo watch para desenvolvimento
```

Antes de considerar qualquer mudança pronta, o projeto exige (ver a seção "Definition of Done" de [`CLAUDE.md`](CLAUDE.md)):

```bash
npm run sf     # Prettier + ESLint, com autofix
npm test       # Suíte de integração completa
```

---

## 🌍 Deploy

- **Frontend + API**: [Vercel](https://vercel.com/) – deploy automático via Git
- **Banco de dados**: qualquer PostgreSQL gerenciado (Neon, Supabase, RDS, etc.)
- **Storage de documentos**: qualquer S3-compatible (AWS S3, Cloudflare R2 — configure `STORAGE_*` conforme o provedor)
- **E-mail transacional**: [Resend](https://resend.com/) — opcional; sem `RESEND_API_KEY`, as notificações por e-mail viram um no-op silencioso
- **Migrações**: `npm run migrations:up`, ou via `/superadmin/migrations` para quem tiver `is_superadmin = true` na própria conta

---

## 🤝 Como Contribuir

Este é um projeto **open source** – contribuições são **super bem-vindas**!

1. Faça um **fork** deste repositório
2. Crie uma branch para sua feature/bugfix

   ```bash
   git checkout -b minha-feature
   ```

3. Siga as convenções do projeto — arquitetura, padrões de código e o fluxo de "Definition of Done" estão documentados em [`CLAUDE.md`](CLAUDE.md)
4. Faça commit das mudanças seguindo [Conventional Commits](https://www.conventionalcommits.org/) (`npm run commit` abre um prompt interativo)

   ```bash
   git commit -m "feat: adiciona minha nova feature"
   ```

5. Envie a branch e abra um **Pull Request** 🎉

   ```bash
   git push origin minha-feature
   ```

---

## 🗺️ Roadmap

O projeto é desenvolvido em fases; as Fases 1–8 (autenticação, documentos, links de compartilhamento, analytics, frontend completo, engajamento/confiança/crescimento e recursos de IA) já estão concluídas. Próximos passos:

- 👥 **Workspaces em equipe & data rooms** — múltiplos usuários por workspace, permissões por papel, agrupamento de documentos em uma coleção com um único link
- 💳 **Monetização** — planos pagos via Stripe, gate de features premium

O roadmap completo, fase a fase, com o que já foi entregue e o que falta, está em [`TODO.md`](TODO.md). O histórico detalhado de cada mudança, incluindo o raciocínio por trás de decisões técnicas, está em [`CHANGELOG.md`](CHANGELOG.md).

---

## 📜 Licença

Distribuído sob a licença MIT. Veja [`LICENSE`](LICENSE) para mais detalhes.
