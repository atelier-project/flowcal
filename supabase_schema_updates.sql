
-- 1. ADD NEW COLUMNS TO PROFILES & INDEX
alter table public.profiles 
add column if not exists full_name text,
add column if not exists avatar_url text,
add column if not exists deleted_at timestamp with time zone;

create index if not exists profiles_deleted_at_idx on public.profiles (deleted_at);

-- 2. HELPER: IS_ACTIVE_USER (Hardened)
create or replace function public.is_active_user(user_id uuid)
returns boolean 
language sql 
security definer 
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and deleted_at is null and is_banned = false
  );
$$;
alter function public.is_active_user(uuid) owner to postgres;
revoke execute on function public.is_active_user(uuid) from public;
grant execute on function public.is_active_user(uuid) to authenticated, anon; 

-- 3. UPDATED PROFILE RLS (Safe Updates & Visibility)
drop policy if exists "Profiles: Update own" on public.profiles;
drop policy if exists "Profiles: Restricted Self Update" on public.profiles; -- Ensure clean slate

-- Self Update Policy
create policy "Profiles: Restricted Self Update"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id and deleted_at is null )
  with check (
    (select auth.uid()) = id 
    and role = (select role from public.profiles where id = (select auth.uid()))
    and tier = (select tier from public.profiles where id = (select auth.uid()))
    and is_banned = (select is_banned from public.profiles where id = (select auth.uid()))
    and deleted_at is null
  );

-- View Policy Update (Hide soft deleted from non-admins)
drop policy if exists "Profiles: View" on public.profiles;
create policy "Profiles: View" 
  on public.profiles for select 
  to authenticated, anon
  using ( 
    ((select auth.uid()) = id) 
    or 
    (deleted_at is null and is_banned = false) -- Publicly visible profiles must be active
    or 
    public.is_app_admin() -- Admins see everything
  );

-- 4. RPC: SCHEDULE ACCOUNT DELETION (Hardened)
create or replace function public.schedule_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set deleted_at = now()
  where id = (select auth.uid());
end;
$$;
alter function public.schedule_account_deletion() owner to postgres;
revoke execute on function public.schedule_account_deletion() from public;
grant execute on function public.schedule_account_deletion() to authenticated;

-- 5. RPC: RECOVER ACCOUNT (Admin Only & Hardened)
create or replace function public.admin_recover_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
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
revoke execute on function public.admin_recover_account(uuid) from public;
grant execute on function public.admin_recover_account(uuid) to authenticated;
