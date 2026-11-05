-- Free trial: a new account gets 2 interviews and 2 conversations of 5 minutes each.
-- Accounts listed in unlimited_users (every account that exists when this runs, plus anyone unlocked later) have no limit.
-- The count lives in its own table: deleting a session from the history does not give the slot back.

create table public.unlimited_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.unlimited_users (user_id, note)
select id, 'existing account at trial launch' from auth.users
on conflict (user_id) do nothing;

create table public.session_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null,
  used integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, mode),
  constraint session_usage_mode_check check (mode in ('interview', 'conversation')),
  constraint session_usage_used_check check (used >= 0)
);

-- Neither table has write policies: only the trigger below (and the service role) changes them.
alter table public.unlimited_users enable row level security;
alter table public.session_usage enable row level security;

create policy "Users can view their own session usage"
  on public.session_usage
  for select
  using ((select auth.uid()) = user_id);

create function public.trial_session_limit()
returns integer
language sql
immutable
as $$ select 2 $$;

create function public.trial_session_minutes()
returns integer
language sql
immutable
as $$ select 5 $$;

-- Counts each new session of a limited account and refuses the one past the limit.
-- A failed insert (a duplicate id on retry, say) rolls the count back with it.
create function public.enforce_trial_session_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed integer;
begin
  if exists (select 1 from public.unlimited_users where user_id = new.user_id) then
    return new;
  end if;

  -- A retried insert of a session that already exists is left to fail on the primary key, which the app recovers from.
  if exists (select 1 from public.interviews where id = new.id) then
    return new;
  end if;

  insert into public.session_usage as usage (user_id, mode, used)
  values (new.user_id, new.mode, 1)
  on conflict (user_id, mode) do update
    set used = usage.used + 1, updated_at = timezone('utc', now())
    where usage.used < public.trial_session_limit()
  returning used into claimed;

  if claimed is null then
    raise exception 'SESSION_LIMIT_REACHED' using errcode = 'P0001', hint = new.mode;
  end if;

  new.duration_minutes := public.trial_session_minutes();
  return new;
end;
$$;

create trigger interviews_enforce_trial_session_limit
before insert on public.interviews
for each row
execute function public.enforce_trial_session_limit();

-- What the app shows: whether the account is limited and how many sessions of each mode are left.
create function public.get_session_allowance()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'limited', not exists (select 1 from public.unlimited_users where user_id = auth.uid()),
    'limit', public.trial_session_limit(),
    'minutes', public.trial_session_minutes(),
    'interviewsUsed', coalesce((select used from public.session_usage where user_id = auth.uid() and mode = 'interview'), 0),
    'conversationsUsed', coalesce((select used from public.session_usage where user_id = auth.uid() and mode = 'conversation'), 0)
  )
  where auth.uid() is not null
$$;

revoke all on function public.get_session_allowance() from public, anon;
grant execute on function public.get_session_allowance() to authenticated;
revoke all on function public.enforce_trial_session_limit() from public, anon, authenticated;
