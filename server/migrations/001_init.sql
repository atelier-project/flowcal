-- FlowCal self-hosted schema.
-- Ported from supabase_schema.sql. Two key differences from the Supabase version:
--   1. Supabase's `auth.users` is replaced by a local `users` table that holds
--      the email + bcrypt password hash. `profiles` references it 1:1.
--   2. Row-Level Security is NOT used. All authorization is enforced in the API
--      layer (see server/routes/*). The RLS policies in the Supabase schema are
--      reproduced there as query guards / middleware.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- USERS (replaces Supabase auth.users) -----------------------------------------
create table if not exists users (
    id            uuid primary key default gen_random_uuid(),
    email         text not null unique,
    password_hash text not null,
    created_at    timestamptz not null default now()
);

-- PROFILES ---------------------------------------------------------------------
create table if not exists profiles (
    id                     uuid primary key references users(id) on delete cascade,
    email                  text,
    full_name              text,
    avatar_url             text,
    tier                   text default 'free',
    role                   text default 'user', -- 'user', 'admin', 'superuser'
    is_banned              boolean default false,
    support_access_granted boolean default false,
    deleted_at             timestamptz,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now()
);

-- TEAMS ------------------------------------------------------------------------
create table if not exists teams (
    id         uuid primary key default gen_random_uuid(),
    name       text not null,
    slug       text not null unique,
    branding   jsonb default '{}'::jsonb,
    owner_id   uuid not null references profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- TEAM MEMBERS -----------------------------------------------------------------
create table if not exists team_members (
    team_id   uuid references teams(id) on delete cascade,
    user_id   uuid references profiles(id) on delete cascade,
    role      text default 'member', -- 'owner', 'admin', 'member'
    joined_at timestamptz not null default now(),
    primary key (team_id, user_id)
);

-- FLOWS ------------------------------------------------------------------------
create table if not exists flows (
    id          uuid primary key default gen_random_uuid(),
    owner_id    uuid not null references profiles(id) on delete cascade,
    team_id     uuid references teams(id) on delete set null,
    name        text not null default 'Untitled Flow',
    data        jsonb default '{}'::jsonb,
    is_public   boolean default false,
    is_template boolean default false,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- INDEXES ----------------------------------------------------------------------
create index if not exists flows_owner_id_idx   on flows(owner_id);
create index if not exists flows_team_id_idx    on flows(team_id);
create index if not exists team_members_user_idx on team_members(user_id);

-- updated_at maintenance (replaces Supabase's moddatetime extension) ------------
create or replace function set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at before update on profiles
    for each row execute procedure set_updated_at();

drop trigger if exists teams_set_updated_at on teams;
create trigger teams_set_updated_at before update on teams
    for each row execute procedure set_updated_at();

drop trigger if exists flows_set_updated_at on flows;
create trigger flows_set_updated_at before update on flows
    for each row execute procedure set_updated_at();
