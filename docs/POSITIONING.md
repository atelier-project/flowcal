# FlowCal & Atelier: open source and hosting

This note explains how the open-source FlowCal project relates to the commercial
[Atelier](https://tryatelier.dev/) platform, so contributors and self-hosters know
what to expect.

## The short version

- **The FlowCal open core is fully open source** under Apache-2.0 — the editor, the
  evaluation engine, all node types, custom nodes, import/export, sharing, autosave,
  and version history. It is a complete, genuinely useful tool on its own for
  individuals and self-hosted teams. No part of the open core is crippled or
  time-limited.
- **You can run it anywhere** — `docker compose up` with any Postgres, or point it
  at Supabase. There is no lock-in; the backend is pluggable
  (`src/services/backend/`).
- **Atelier is a separate commercial product** that provides *first-class hosting*
  for FlowCal (one-click deploy, a managed database, TLS, public access, support)
  **and a commercial edition** with premium features aimed at teams and scale.
  Atelier is the paved road — a convenience, not a requirement for using the open
  core.

## Why open source

FlowCal's core is open because a great, unencumbered tool is the best introduction
to Atelier. Every self-hoster is a potential Atelier user; every publicly shared
flow is hosted somewhere and shows what the platform can do. Adoption is the goal,
so we keep the open core genuinely useful, portable, and no-strings — never a
hollowed-out teaser.

## Where the commercial line sits

This is an **open-core** model. The line falls between *individual/self-host
capability* (open) and *team, scale, and governance* features plus hosting
(commercial):

| Open core (public repo, Apache-2.0) | Commercial edition + Atelier |
|---|---|
| Editor, engine, all node types, custom nodes | One-click deploy + managed hosting |
| Self-host on any Postgres / Supabase | Managed `flowcal-db`, backups, TLS, public access |
| Sharing, autosave, **basic** version history (recent versions, preview, basic diff) | **Deep** version history: long retention, advanced diff, one-click restore |
| Single-user and self-hosted multi-user | **Real-time collaboration** (live presence + co-editing) |
| Personal cloud flows | **Team workspaces**: shared folders, role management, plan-based flow limits |
| — | **Enterprise**: SSO, audit log, priority support / SLA |

The principle: **the open core is whole and standalone**, and premium features
*add* team/scale/governance capability on top — we never remove a working
capability from the open core to sell it back. If in doubt, the open core should
always be a tool you'd happily use by yourself or in a small self-hosted team
without hitting an artificial wall.

## Repository structure

FlowCal uses **two repositories**:

- **Public repo (Apache-2.0)** — the open core. This is what self-hosters clone and
  what contributors work in. Anything committed here is Apache-2.0 forever.
- **Private repo** — the commercial edition (the open core plus the premium features
  above). It is the superset from which the public open core is published.

Premium work is tracked as issues labelled **`premium`** in the private repo. The
promotion rule is simple: **everything except `premium`-labelled work belongs in the
public open core.** Contributions from the community always land in the public
Apache-2.0 repo; premium features never migrate *into* it.

> **Status:** as of this writing the repository is still private and the public open
> core has not yet been published. When it is, the public repo is created from the
> open (non-`premium`) subset with a clean history. This section describes the target
> structure.

## Trademarks

The Apache-2.0 license covers the code, not the names. "FlowCal" and "Atelier"
names and logos are reserved (see `NOTICE` and Section 6 of the `LICENSE`). Forks
are welcome but should use a different name to avoid confusion.
