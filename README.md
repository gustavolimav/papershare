# 📄 linkpaper

[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-orange.svg)]()

**DocPaperLink** é uma plataforma open source para **upload, compartilhamento e análise de documentos**.
Com ela, você pode enviar documentos, gerar links configuráveis e ter insights detalhados sobre como os destinatários interagem com o conteúdo.

💡 O objetivo é construir uma solução moderna, segura e colaborativa para quem precisa compartilhar documentos e entender como eles são consumidos.

---

## 🚀 Tecnologias Utilizadas

- ⚛️ **Next.js** – Framework React para frontend + backend integrados
- 📘 **TypeScript** – Tipagem estática para mais segurança e produtividade
- 🐳 **Docker** – Containerização para desenvolvimento e deploy
- 🐘 **PostgreSQL + Neon** – Banco de dados relacional escalável (serverless)
- 📝 **SQL puro** – Sem ORM, consultas otimizadas
- 🧪 **Jest** – Testes automatizados
- ▲ **Vercel** – Deploy simples e rápido

---

## 📂 Estrutura do Projeto

```
📦 root
 ┣ 📂 pages                # Next.js delivery layer (rotas, controllers)
 ┃ ┗ 📜 index.tsx
 ┣ 📂 models               # Entidades do domínio
 ┃ ┣ 📜 user.ts
 ┃ ┣ 📜 content.ts
 ┃ ┗ 📜 password.ts
 ┣ 📂 repositories         # Queries puras SQL isoladas
 ┃ ┣ 📜 userRepo.ts
 ┃ ┣ 📜 contentRepo.ts
 ┃ ┗ 📜 passwordRepo.ts
 ┣ 📂 services             # Regras de negócio (use cases)
 ┃ ┣ 📜 authService.ts
 ┃ ┣ 📜 documentService.ts
 ┃ ┗ 📜 analyticsService.ts
 ┣ 📂 infra                # Integrações externas
 ┃ ┣ 📂 db
 ┃ ┃ ┣ 📜 connection.ts
 ┃ ┃ ┣ 📂 migrations
 ┃ ┣ 📂 configs
 ┃ ┃ ┣ 📜 staging.ts
 ┃ ┃ ┣ 📜 production.ts
 ┃ ┃ ┗ 📜 provisioning.ts
 ┣ 📂 tests                # Testes unitários e de integração
 ┃ ┣ 📜 user.test.ts
 ┃ ┗ 📜 content.test.ts
 ┣ 📜 docker-compose.yml
 ┣ 📜 Dockerfile
 ┣ 📜 package.json
 ┗ 📜 README.md
```

---

## ⚙️ Como Rodar Localmente

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/docpaperlink.git
cd docpaperlink
```

### 2. Configure variáveis de ambiente

Crie um arquivo `.env.local` com:

```env
DATABASE_URL=postgres://usuario:senha@host:5432/dbname
```

### 3. Rodar com Docker

```bash
docker-compose up --build
```

### 4. Rodar sem Docker

```bash
npm install
npm run dev
```

---

## 🧪 Rodando Testes

```bash
npm run test
```

---

## 🌍 Deploy

- **Frontend + API**: [Vercel](https://vercel.com/)
- **Banco de Dados**: [Neon](https://neon.tech/)

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
