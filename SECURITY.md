# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Instead, report privately via [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
(the **Security → Report a vulnerability** button on this repo), or email the
maintainer. Please include:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if possible),
- affected version / commit.

We'll acknowledge your report, work on a fix, and coordinate disclosure with you.

## Supported versions

FlowCal is pre-1.0; security fixes land on the default branch (`main`). Self-hosters
should track `main` (or tagged releases once published).

## Deployment hardening

If you self-host, please:

- set a strong random **`JWT_SECRET`** (`openssl rand -hex 32`) — never use the
  example default,
- set **`COOKIE_SECURE=true`** when serving over HTTPS,
- use a strong **`POSTGRES_PASSWORD`** and keep the database off the public
  internet,
- never commit real secrets — `.env` files are gitignored; only `.env.example`
  templates belong in the repo.
