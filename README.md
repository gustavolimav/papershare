# 📄 papershare

[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-orange.svg)]()

**Papershare** é uma plataforma open source para **upload, compartilhamento e análise de documentos**.
Com ela, você pode enviar documentos, gerar links configuráveis e ter insights detalhados sobre como os destinatários interagem com o conteúdo.

💡 O objetivo é construir uma solução moderna, segura e colaborativa para quem precisa compartilhar documentos e entender como eles são consumidos.

---

## 🚀 Tecnologias Utilizadas

- ⚛️ **Next.js 14** – Framework React para frontend + backend integrados
- 📈 **TypeScript 5** – Tipagem estática para mais segurança e produtividade
- 🐳 **Docker** – Containerização para desenvolvimento e deploy
- 🐘 **PostgreSQL 16** – Banco de dados relacional com migrações SQL puras
- 📝 **SQL puro** – Sem ORM, consultas otimizadas com postgres-migrations
- 🧪 **Jest** – Testes de integração automatizados
- 🔒 **bcrypt** – Autenticação baseada em sessões
- ▲ **Vercel** – Deploy simples e rápido

---

## 📂 Estrutura do Projeto

```
📦 papershare/
 ┣ 📂 pages/               # Next.js delivery layer (rotas + API)
 ┃ ┣ 📂 api/v1/          # API REST endpoints
 ┃ ┃ ┣ 📄 status/       # Health check
 ┃ ┃ ┣ 📄 users/        # Gerenciamento de usuários
 ┃ ┃ ┣ 📄 sessions/     # Autenticação
 ┃ ┃ ┗ 📄 migrations/   # Migrações do banco
 ┃ ┗ 📄 index.tsx        # Página inicial
 ┣ 📂 models/              # Entidades do domínio (business logic)
 ┃ ┣ 📄 user.ts          # CRUD de usuários
 ┃ ┣ 📄 authentication.ts # Lógica de login
 ┃ ┣ 📄 session.ts       # Gerenciamento de sessões
 ┃ ┣ 📄 password.ts      # Hash de senhas (bcrypt)
 ┃ ┗ 📄 migrator.ts      # Sistema de migrações
 ┣ 📂 infra/               # Infraestrutura
 ┃ ┣ 📄 database.ts      # Conexão PostgreSQL
 ┃ ┣ 📄 controller.ts    # Middleware de erros
 ┃ ┣ 📄 errors.ts        # Classes de erro personalizadas
 ┃ ┣ 📂 migrations/      # Migrações SQL puras
 ┃ ┃ ┣ 📄 001-create-users.sql
 ┃ ┃ ┣ 📄 002-update-users.sql
 ┃ ┃ ┗ 📄 003-create-sessions.sql
 ┃ ┗ 📄 compose.yaml     # Docker setup
 ┣ 📂 tests/               # Testes de integração
 ┃ ┣ 📄 orchestrator.ts  # Utilitários de teste
 ┃ ┗ 📂 integration/     # Testes de API
 ┣ 📂 types/               # Definições TypeScript
 ┃ ┗ 📄 index.ts         # Todas as interfaces
 ┣ 📄 package.json
 ┗ 📄 warp.md            # Contexto do projeto
```

---

## ⚙️ Como Rodar Localmente

### 1. Clone o repositório

```bash
git clone https://github.com/gustavolimav/papershare.git
cd papershare
```

### 2. Configure variáveis de ambiente

O projeto já vem com `.env.development` configurado para desenvolvimento local:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=local_user
POSTGRES_DB=local_db
POSTGRES_PASSWORD=local_password
```

### 3. Instalar dependências

```bash
npm install
```

### 4. Rodar o projeto

**Com Docker (recomendado):**

```bash
npm run dev  # Sobe o banco, roda migrações e inicia o servidor
```

**Ou manualmente:**

```bash
npm run services:up          # Sobe o PostgreSQL
npm run services:wait:postgres # Aguarda o banco ficar disponível
npm run migrations:up         # Executa migrações
next dev                      # Inicia o servidor Next.js
```

---

## 📚 API Documentation

A API REST está disponível em `http://localhost:3000/api/v1/`

### Endpoints Principais:

- `GET /api/v1/status` - Health check do sistema
- `POST /api/v1/users` - Criar novo usuário
- `GET /api/v1/users/[username]` - Buscar usuário por username
- `PATCH /api/v1/users/[username]` - Atualizar usuário
- `POST /api/v1/sessions` - Login (cria sessão)
- `GET /api/v1/migrations` - Listar migrações pendentes
- `POST /api/v1/migrations` - Executar migrações

---

## 🧪 Rodando Testes

```bash
npm test                    # Executa todos os testes
npm run test:watch         # Modo watch para desenvolvimento
```

---

## 🌍 Deploy

- **Frontend + API**: [Vercel](https://vercel.com/) – Deploy automático via Git
- **Banco de Dados**: [Neon](https://neon.tech/) ou [Supabase](https://supabase.com/) – PostgreSQL serverless
- **Migrações**: Executadas automaticamente via `npm run migrations:up`

---

## 🤝 Como Contribuir

Este é um projeto **open source** – contribuições são **super bem-vindas**!

1. Faça um **fork** deste repositório
2. Crie uma branch para sua feature/bugfix

   ```bash
   git checkout -b minha-feature
   ```

3. Faça commit das mudanças

   ```bash
   git commit -m "feat: adiciona minha nova feature"
   ```

4. Envie a branch

   ```bash
   git push origin minha-feature
   ```

5. Abra um **Pull Request** 🎉

---

## 🔮 Roadmap Futuro

- 🔒 Permissões avançadas para links (senha, expiração, bloqueio de download)
- 📊 Dashboard com insights (views, tempo por página, geolocalização)
- 🖋️ Assinatura eletrônica integrada
- 🧠 Insights com IA (resumos automáticos, sugestões de melhorias)

---

## 📜 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais detalhes.
