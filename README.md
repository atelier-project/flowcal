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

## Deploy to Atelier

[Atelier](https://tryatelier.dev/) can build and host FlowCal straight from this
repo — it clones the repo, builds the root `Dockerfile`, and runs it. Use the
**Clone a Git Repo** flow
([guide](https://tryatelier.dev/guides/user-guide/#clone-a-git-repo)):

1. **Deploy Postgres** as its own app first (Apps → **Create** → *Deploy an
   Image*): image `postgres:16`, port `5432`. Set its secrets
   `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`, plus `PGDATA=/data/pgdata`
   so the database persists on the app's `/data` volume.
2. **Clone this repo** (Apps → **Create** → *Clone a Git Repo*): enter the repo's
   HTTPS URL and branch `main`. The root `Dockerfile` builds the SPA + API into a
   single image. (Public repo, or supply a read-only token in the *Private
   repository* section.)
3. **Set the app's secrets** so it can reach the database and sign sessions:
   - `DATABASE_URL=postgres://<user>:<pass>@<db-app>.atelier-apps.svc.cluster.local:80/<db>`
     (read the DB app's in-cluster URL from its app page; the in-cluster Service
     forwards port 80 to Postgres)
   - `JWT_SECRET` — a long random value (`openssl rand -hex 32`)
   - `ADMIN_EMAIL=you@example.com` *(optional)* — promotes that account to admin
     on startup once you've signed up
   - `COOKIE_SECURE=false` unless you serve it over HTTPS

The app applies migrations and waits for the database on startup, so it tolerates
Postgres still initializing on first deploy.

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

## Generating flows from a calculation

[`skills/calc-to-flowcal/`](skills/calc-to-flowcal/) documents the flow JSON format
and node catalog so an LLM can turn a calculation (e.g. `(base + tax) * qty`) into an
importable FlowCal flow. It includes the schema, the evaluation model, the full node
reference, and verified examples.
