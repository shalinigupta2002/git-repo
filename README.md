# B2B Marketplace

Monorepo: **React/Vite frontend** (`client/`) + **Express/Prisma API** (`server/`).

## Quick start (local)

```bash
# Backend
cd server
cp .env.example .env          # set DATABASE_URL, JWT_SECRET
npm install
npm run db:migrate:deploy
npm run catalog:migrate
npm run db:seed
npm run dev                   # http://localhost:3001

# Frontend (separate terminal)
cd client
cp .env.example .env          # optional in dev (Vite proxy defaults to :3001)
npm install
npm run dev                   # http://localhost:5173
```

## Build & test (from repo root)

```bash
npm run install:all
npm run build                 # frontend production build + prisma generate
npm run test                  # server Jest + client Vitest
npm run test:e2e              # Playwright (requires DB — see server/docs/DEPLOYMENT.md)
```

### Production frontend build

`client/.env.production` defaults to `http://localhost:3001/api` for local builds.

Override for split deployments:

```bash
# Vercel / Render frontend + API on different hosts
VITE_API_BASE_URL=https://your-api.onrender.com/api npm run build --prefix client

# Docker / nginx same-origin proxy
VITE_API_BASE_URL=/api npm run build --prefix client
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [server/README.md](./server/README.md) | API setup, endpoints overview |
| [server/docs/DEPLOYMENT.md](./server/docs/DEPLOYMENT.md) | Migrations, CI, Render, Docker |
| [server/docs/RFQ_API.md](./server/docs/RFQ_API.md) | RFQ / quotation API reference |
| [client/README.md](./client/README.md) | Frontend env vars, scripts |

## Deployment

- **API (Render):** `npm run render:build` then `npm start` — see [DEPLOYMENT.md](./server/docs/DEPLOYMENT.md)
- **Frontend (Vercel):** set `VITE_API_BASE_URL` to your Render API URL ending in `/api`
- **Docker:** `docker compose up --build` — client nginx proxies `/api` to the server container
