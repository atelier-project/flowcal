-- Runtime, admin-editable application settings.
--
-- Environment variables are read once at boot, so a setting an admin can flip
-- from the UI needs somewhere to live. This is a small key/value store for
-- exactly that: settings that are operational rather than deployment concerns.
--
-- Precedence (see server/settings.js): a row here wins; if there is no row, the
-- environment variable is the default. So existing env-only deployments keep
-- working untouched, and the env var still seeds the initial behaviour.

create table if not exists app_settings (
    key        text primary key,
    value      jsonb       not null,
    updated_at timestamptz not null default now(),
    updated_by uuid references profiles(id) on delete set null
);
