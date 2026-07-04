-- SECURE DEFAULT PRIVILEGES
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
grant usage on schema public to public, anon, authenticated;

-- EXTENSIONS
create extension if not exists moddatetime schema extensions;

-- TABLES --

-- PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  tier text default 'free',
  role text default 'user', -- 'user', 'admin', 'superuser'
  is_banned boolean default false,
  support_access_granted boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.profiles enable row level security;

create trigger handle_updated_at_profiles
  before update on public.profiles
  for each row execute procedure extensions.moddatetime (updated_at);

-- TEAMS
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  branding jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  owner_id uuid references public.profiles(id) not null
);
alter table public.teams enable row level security;

create trigger handle_updated_at_teams
  before update on public.teams
  for each row execute procedure extensions.moddatetime (updated_at);

-- TEAM MEMBERS
create table public.team_members (
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member', -- 'owner', 'admin', 'member'
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (team_id, user_id)
);
alter table public.team_members enable row level security;

-- FLOWS
create table public.flows (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete set null,
  name text not null default 'Untitled Flow',
  data jsonb default '{}'::jsonb,
  is_public boolean default false,
  is_template boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.flows enable row level security;

create trigger handle_updated_at_flows
  before update on public.flows
  for each row execute procedure extensions.moddatetime (updated_at);

-- FLOW VERSIONS (point-in-time snapshots for browse + non-destructive restore)
create table public.flow_versions (
  id uuid default gen_random_uuid() primary key,
  flow_id uuid references public.flows(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete set null,
  data jsonb not null,
  label text,
  origin text not null default 'manual',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index flow_versions_flow_id_created_idx on public.flow_versions (flow_id, created_at desc);
alter table public.flow_versions enable row level security;


-- HELPER FUNCTIONS (SECURITY DEFINER to bypass RLS) --

-- Check if current user is App Admin
create or replace function public.is_app_admin()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superuser')
  );
$$;
alter function public.is_app_admin() owner to postgres;

-- Get current user's role in a specific team
create or replace function public.get_team_role(target_team_id uuid)
returns text
language sql security definer set search_path = public
as $$
  select role from public.team_members
  where team_id = target_team_id and user_id = auth.uid();
$$;
alter function public.get_team_role(uuid) owner to postgres;

-- Check if current user can view a user's content (Support Access)
create or replace function public.has_support_access(target_user_id uuid)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = target_user_id and support_access_granted = true
  ) and public.is_app_admin();
$$;
alter function public.has_support_access(uuid) owner to postgres;


-- RLS POLICIES --

-- 1. PROFILES
create policy "Profiles: View" 
  on public.profiles for select 
  to authenticated, anon
  using ( auth.uid() = id or public.is_app_admin() );

create policy "Profiles: Update own" 
  on public.profiles for update 
  to authenticated
  using ( auth.uid() = id );

create policy "Profiles: Delete own"
  on public.profiles for delete
  to authenticated
  using ( auth.uid() = id );

-- 2. TEAMS
create policy "Teams: View"
  on public.teams for select
  to authenticated
  using ( 
    owner_id = auth.uid() 
    or public.get_team_role(id) is not null 
    or public.is_app_admin()
  );

create policy "Teams: Create"
  on public.teams for insert
  to authenticated
  with check ( auth.uid() = owner_id );

create policy "Teams: Manage"
  on public.teams for all
  to authenticated
  using ( owner_id = auth.uid() );

-- 3. TEAM MEMBERS
create policy "TeamMembers: View"
  on public.team_members for select
  to authenticated
  using ( 
    -- View if I am in the team
    public.get_team_role(team_id) is not null 
    or public.is_app_admin()
  );

create policy "TeamMembers: Manage"
  on public.team_members for all
  to authenticated
  using (
    -- Manage if I am Owner or Admin of the team
    public.get_team_role(team_id) in ('owner', 'admin')
  );

-- 4. FLOWS
-- View: Public flows allow anon access. Others require auth.
create policy "Flows: View" 
  on public.flows for select 
  to authenticated, anon
  using ( 
    owner_id = auth.uid() 
    or (team_id is not null and public.get_team_role(team_id) is not null) 
    or is_public = true 
    or public.has_support_access(owner_id)
  );

create policy "Flows: Insert"
  on public.flows for insert
  to authenticated
  with check ( auth.uid() = owner_id );

-- Update: Owner OR Team Editor/Admin OR app admin (the last so admins can
-- publish any flow as a template — see setFlowTemplate).
create policy "Flows: Update"
  on public.flows for update
  to authenticated
  using (
    owner_id = auth.uid()
    or (team_id is not null and public.get_team_role(team_id) in ('owner', 'admin'))
    or public.is_app_admin()
  );

create policy "Flows: Delete"
  on public.flows for delete
  to authenticated
  using (
    owner_id = auth.uid()
    or (team_id is not null and public.get_team_role(team_id) = 'owner')
  );

-- 5. FLOW VERSIONS
-- Manageable by whoever can edit the parent flow (owner or team owner/admin).
-- No anon/public grant — shared viewers see only the current flow, not history.
create policy "Flow Versions: View"
  on public.flow_versions for select
  to authenticated
  using (
    exists (
      select 1 from public.flows f
      where f.id = flow_id
        and ( f.owner_id = auth.uid()
              or (f.team_id is not null and public.get_team_role(f.team_id) in ('owner', 'admin')) )
    )
  );

create policy "Flow Versions: Insert"
  on public.flow_versions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.flows f
      where f.id = flow_id
        and ( f.owner_id = auth.uid()
              or (f.team_id is not null and public.get_team_role(f.team_id) in ('owner', 'admin')) )
    )
  );

create policy "Flow Versions: Delete"
  on public.flow_versions for delete
  to authenticated
  using (
    exists (
      select 1 from public.flows f
      where f.id = flow_id
        and ( f.owner_id = auth.uid()
              or (f.team_id is not null and public.get_team_role(f.team_id) in ('owner', 'admin')) )
    )
  );


-- HANDLERS
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;
alter function public.handle_new_user() owner to postgres;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =======================================================
-- NEW MIGRATIONS FOR USER PROFILE & SETTINGS
-- =======================================================

-- 1. ADD NEW COLUMNS TO PROFILES
alter table public.profiles 
add column if not exists full_name text,
add column if not exists avatar_url text,
add column if not exists deleted_at timestamp with time zone;

-- 2. HELPER: IS_ACTIVE_USER
create or replace function public.is_active_user(user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and deleted_at is null and is_banned = false
  );
$$ language sql security definer;
alter function public.is_active_user(uuid) owner to postgres;

-- 3. UPDATED PROFILE RLS (Safe Updates)
drop policy if exists "Profiles: Update own" on public.profiles;

create policy "Profiles: Restricted Self Update"
  on public.profiles for update
  to authenticated
  using ( auth.uid() = id and deleted_at is null )
  with check (
    auth.uid() = id 
    and role = (select role from public.profiles where id = auth.uid())
    and tier = (select tier from public.profiles where id = auth.uid())
    and is_banned = (select is_banned from public.profiles where id = auth.uid())
    and deleted_at is null
  );

-- 4. RPC: SCHEDULE ACCOUNT DELETION
create or replace function public.schedule_account_deletion()
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set deleted_at = now()
  where id = auth.uid();
end;
$$;
alter function public.schedule_account_deletion() owner to postgres;

-- 5. RPC: RECOVER ACCOUNT (Admin Only)
create or replace function public.admin_recover_account(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Access Denied';
  end if;

  update public.profiles
  set deleted_at = null
  where id = target_user_id;
end;
$$;
alter function public.admin_recover_account(uuid) owner to postgres;
