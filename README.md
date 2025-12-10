# Leão Estofados – Sistema de Gestão

Aplicação web completa (frontend React + API Express + SQLite) para gestão de vendas (PDV), produção, estoque, boletos e ponto.

## Visão Geral

- Frontend em React (Vite) com Radix UI e Tailwind.
- API local em Express servindo um banco SQLite via `better-sqlite3`.
- Upload de arquivos (boletos e imagens de produtos) gravados em `data/uploads` e servidos via `/files`.
- Autenticação simples local (sem serviços externos).

## Requisitos

- Node.js 18 ou superior
- Git
- Windows (recomendado; possui script `start-dev.bat`), mas funciona em outras plataformas com `npm run dev` + `node server/index.mjs`.

## Instalação e Execução

1. Instale dependências:
   - `npm install`
2. Desenvolvimento (Windows):
   - Execute `start-dev.bat` (duplo clique). Sobe a API e o Vite.
3. Alternativa manual:
   - API: `node server/index.mjs`
   - Frontend: `npm run dev`
4. Acesse:
   - Frontend: `http://localhost:8080`
   - Health da API: `http://localhost:3001/api/health`

## Scripts

- `npm run dev` — Vite dev server (`http://localhost:8080`)
- `npm run server` — API Express (`http://localhost:3001`)
- `npm run build` — build de produção do frontend
- `npm run preview` — preview do build
- `npm run lint` — lint com ESLint

## Configuração

- Proxy do Vite encaminha `/api` e `/files` para a API local (`vite.config.ts`).
- Variáveis opcionais:
  - `VITE_API_URL` — base da API (se quiser apontar para outro host; em dev use o proxy). Escreva em `.env` se necessário.

## Banco de Dados

- Local: `data/app.db` (criado na primeira execução).
- Modo WAL habilitado para melhor concorrência.
- Tabelas principais:
  - `products` (inclui `image_url`)
  - `customers` (inclui `whatsapp`)
  - `sales`, `sale_items`
  - `cash_register_sessions`
  - `production_orders`
  - `inventory_items`, `stock_movements`
  - `boletos`

## Uploads e Arquivos

- Raiz de uploads: `data/uploads`.
- Boletos (PDF): `POST /api/upload/boletos` → retorna `/files/boletos/{nome}`.
- Imagens de produtos: `POST /api/upload/products` → retorna `/files/products/{nome}`.

## Principais Dependências

- Runtime:
  - `express`, `cors`, `better-sqlite3`
- Frontend:
  - `react`, `react-router-dom`, `@tanstack/react-query`, `@vitejs/plugin-react-swc`
  - Radix UI, shadcn/ui, `lucide-react`, `tailwindcss`, `date-fns`
- Dev:
  - `typescript`, `eslint`, `vite`

## Fluxos Importantes

- PDV:
  - `POST /api/sales/complete` finaliza venda de forma transacional: cria venda, insere itens, atualiza estoque e totais do caixa.
  - Envio de comprovante: botão “WhatsApp” monta mensagem e abre `wa.me` com o número do cliente (campo `whatsapp`).
- Produção:
  - Lista com status editável e modal de detalhes.
- Estoque:
  - Itens e movimentos (entrada/saída) com validações.
- Boletos:
  - Cadastro + upload de PDF + marcação como pago.

## Publicação no GitHub

> Crie um repositório vazio no GitHub (por exemplo `plush-track-pro`) e rode os comandos abaixo na raiz do projeto.

```powershell
# Inicializar repositório
git init

# Garantir que arquivos gerados e dados locais não vão para o repositório
# (já incluído em .gitignore)

# Adicionar todos os arquivos
git add .

# Primeiro commit
git commit -m "feat: projeto inicial (frontend + api + sqlite)"

# Adicionar remoto (substitua pelo seu)
# Ex.: https://github.com/<seu-usuario>/<seu-repo>.git
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git

# Definir branch principal
git branch -M main

# Enviar para o GitHub
git push -u origin main
```

## Observações

- `.env` e `data/` estão ignorados no Git para evitar exposição de dados e arquivos locais.
- Se desejar versionar apenas o esquema do banco, adote migrações e mantenha `data/` fora do repositório.

## Licença

Defina a licença de sua escolha (MIT, GPL, etc.).
