# FlowCal Server

Self-hosted backend for FlowCal: an Express + Postgres API that replaces Supabase.
It provides authentication, flow storage, profiles, and admin operations, and can
also serve the built SPA in production.

This is the backend half of FlowCal's pluggable architecture. The frontend talks to
it when started with `VITE_BACKEND=api` (see the repo root README). With
`VITE_BACKEND=supabase` (the default) this server is not used.

## Stack

- **Express** — HTTP API under `/api/*`
- **Postgres** — accessed with the raw `pg` driver (no ORM); plain SQL migrations
- **JWT** auth in an httpOnly cookie; passwords hashed with bcryptjs

## Requirements

- Node 18+
- A Postgres database

## Setup

```bash
cd server
cp .env.example .env          # then edit DATABASE_URL and JWT_SECRET
npm install
npm run migrate               # create tables
npm run create-admin -- you@example.com yourpassword   # first admin (optional)
npm run dev                   # http://localhost:3001
```

## Environment

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Secret for signing session tokens (**required in production**) |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `PORT` | Listen port (default `3001`) |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_ORIGIN` | Dev-only: Vite origin allowed for credentialed CORS |
| `COOKIE_SECURE` | `true` to mark the session cookie Secure (HTTPS) |
| `STATIC_DIR` | Absolute path to the built SPA (`dist/`) to serve in production |

## API

All auth-protected routes accept the session via the `fc_session` cookie or an
`Authorization: Bearer <token>` header.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/health` | — | Liveness check |
| POST   | `/api/auth/signup` | — | Create user + profile, sets session |
| POST   | `/api/auth/signin` | — | Sign in, sets session |
| POST   | `/api/auth/signout` | — | Clear session |
| GET    | `/api/auth/session` | — | Current session or `null` |
| GET    | `/api/flows` | user | Flows visible to the user |
| POST   | `/api/flows` | user | Create a flow |
| GET    | `/api/flows/:id` | user | Get a flow (if viewable) |
| PATCH  | `/api/flows/:id` | user | Update (owner or team owner/admin) |
| DELETE | `/api/flows/:id` | user | Delete (owner or team owner) |
| POST   | `/api/flows/:id/duplicate` | user | Copy a viewable flow |
| GET    | `/api/profiles/:id` | user | Own profile, or any for admins |
| PATCH  | `/api/profiles/me` | user | Update own profile (restricted fields) |
| POST   | `/api/profiles/me/deletion` | user | Schedule account deletion |
| GET    | `/api/admin/users` | admin | List all users |
| GET    | `/api/admin/flows` | admin | List all flows |
| PATCH  | `/api/admin/users/:id/ban` | admin | Ban/unban a user |

## Authorization

The Supabase Row-Level Security policies are reproduced in the API layer rather
than the database:

- Flow visibility / edit / delete rules live in `routes/flowAccess.js` as SQL
  predicates shared across the relevant queries.
- Admin checks (`role in ('admin','superuser')`) live in `middleware/auth.js`.
- `requireAuth` re-reads the profile on every request, so a ban or deletion takes
  effect immediately.

## Project layout

```
server/
  index.js              Express app + static SPA serving
  config.js             Env-driven config
  db.js                 pg Pool + transaction helper
  migrate.js            Forward-only SQL migration runner
  auth/                 password hashing + JWT
  middleware/           requireAuth / requireAdmin, error handling
  routes/               auth, flows, profiles, admin
  migrations/           *.sql (applied in order)
  scripts/createAdmin.js
```
