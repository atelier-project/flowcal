-- Flow version history: point-in-time snapshots of a flow's data for browsing
-- and non-destructive restore. v1 records manual named snapshots; `origin`
-- distinguishes those from system-made ones (e.g. a pre-restore safety copy),
-- and leaves room for throttled auto-snapshots later without another migration.

create table if not exists flow_versions (
    id          uuid primary key default gen_random_uuid(),
    flow_id     uuid not null references flows(id) on delete cascade,
    author_id   uuid references profiles(id) on delete set null,
    data        jsonb not null,
    label       text,
    origin      text not null default 'manual',
    created_at  timestamptz not null default now()
);

-- List is always "newest first for one flow", so index that access path.
create index if not exists flow_versions_flow_id_created_idx
    on flow_versions (flow_id, created_at desc);
