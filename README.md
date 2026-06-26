# FlowCal

A visual node-graph editor and calculator built with React. Create computational
flows by wiring nodes together, with 100+ node types, custom node composition,
real-time evaluation, and cloud storage.

## Backends

FlowCal runs against either of two interchangeable backends, selected with the
`VITE_BACKEND` environment variable:

| `VITE_BACKEND` | Backend | Use when |
|----------------|---------|----------|
| `api` (recommended for self-hosting) | Self-hosted Express + Postgres (`server/`) | You want to own your data with `docker compose up` |
| `supabase` (default) | Supabase | You already use Supabase |

The frontend talks to whichever backend is active through a single provider
interface (`src/services/backend/`), so neither backend leaks into the rest of
the app.

## Quick start — self-hosted (Docker)

Brings up the app (API + SPA in one container) and Postgres:

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

Then open **http://localhost:3001**, sign up, and create the first admin:

```bash
docker compose exec app npm run create-admin -- you@example.com yourpassword
```

Data persists in the `flowcal-db` Docker volume. Configurable via env vars
(`JWT_SECRET`, `POSTGRES_PASSWORD`, `PORT`, `COOKIE_SECURE` — set `true` behind
HTTPS). See `docker-compose.yml`.

## Local development

### Frontend

```bash
npm install
cp .env.example .env     # set VITE_BACKEND and the matching backend vars
npm run dev              # http://localhost:5173
```

### Self-hosted backend (when `VITE_BACKEND=api`)

Run the API separately during development (see `server/README.md` for details):

```bash
cd server
cp .env.example .env     # set DATABASE_URL, JWT_SECRET
npm install
npm run migrate
npm run dev              # http://localhost:3001
```

Point the frontend at it with `VITE_API_URL=http://localhost:3001` in the root
`.env`.

## Commands

```bash
npm run dev          # Vite dev server (HMR)
npm run build        # Production SPA build
npm run lint         # ESLint
npm run test:run     # Vitest (single run)
```

## Architecture

- **Graph engine** (`src/engine/`) — `evaluateGraph()` performs DFS with cycle
  detection; `nodeDefinitions.js` holds the node-type registry.
- **Editor** (`src/components/Editor.jsx`) — canvas state, node CRUD, selection,
  undo/redo, keyboard shortcuts.
- **Backend abstraction** (`src/services/backend/`) — the `BackendProvider`
  interface plus the `supabase` and `api` implementations.
- **Server** (`server/`) — the self-hosted Express + Postgres API. See
  `server/README.md`.

No TypeScript — JSX only. Styling via Tailwind (six themes in `src/themes.js`).
