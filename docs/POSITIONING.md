# FlowCal & Atelier: open source and hosting

This note explains how the open-source FlowCal project relates to the commercial
[Atelier](https://tryatelier.dev/) platform, so contributors and self-hosters know
what to expect.

## The short version

- **FlowCal is fully open source** under Apache-2.0 — the editor, the evaluation
  engine, all node types, custom nodes, import/export, sharing, autosave, and
  versioning. No feature is held back from the open project.
- **You can run it anywhere** — `docker compose up` with any Postgres, or point it
  at Supabase. There is no lock-in; the backend is pluggable
  (`src/services/backend/`).
- **Atelier is a separate commercial product** that provides *first-class hosting*
  for FlowCal: one-click deploy from this repo, a managed database, TLS, public
  access, and official support. Atelier is the paved road — a convenience, not a
  requirement.

## Why open source

FlowCal is open because a great, unencumbered tool is the best introduction to
Atelier. Every self-hoster is a potential Atelier user; every publicly shared flow
is hosted somewhere and shows what the platform can do. Adoption is the goal, so we
optimise for a genuinely useful, portable, no-strings tool.

## Where the commercial line sits

The line is **hosting and platform operations**, not FlowCal source:

| Open source (this repo, Apache-2.0) | Atelier (commercial) |
|---|---|
| Editor, engine, all node types | One-click deploy + managed hosting |
| Self-host on any Postgres / Supabase | Managed `flowcal-db`, backups, TLS, public access |
| Sharing, autosave, versioning | Official support / SLA |
| Single-user and self-hosted multi-user | Hosted multi-tenant convenience |

If FlowCal ever grows an **enterprise tier** (e.g. SSO, org governance, advanced
collaboration), those features would live in a **separate, non-open package** that
composes with this open core through the existing backend provider seam — never by
removing capabilities from the open project. Nothing here is closed today; the seam
just keeps that option open without compromising the open edition.

## Trademarks

The Apache-2.0 license covers the code, not the names. "FlowCal" and "Atelier"
names and logos are reserved (see `NOTICE` and Section 6 of the `LICENSE`). Forks
are welcome but should use a different name to avoid confusion.
