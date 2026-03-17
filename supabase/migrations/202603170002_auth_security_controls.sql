create table if not exists public.auth_rate_limits (
  scope text not null,
  key_hash text not null,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default timezone('utc', now()),
  blocked_until timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (scope, key_hash)
);

create index if not exists auth_rate_limits_blocked_until_idx
  on public.auth_rate_limits (blocked_until);

create table if not exists public.auth_security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  outcome text not null,
  identifier_hash text,
  ip inet,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint auth_security_events_outcome_check check (
    outcome in ('success', 'failure', 'blocked')
  )
);

create index if not exists auth_security_events_event_type_idx
  on public.auth_security_events (event_type, created_at desc);

create index if not exists auth_security_events_created_at_idx
  on public.auth_security_events (created_at desc);

create or replace function public.tre60_set_auth_rate_limits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists tre60_set_auth_rate_limits_updated_at on public.auth_rate_limits;
create trigger tre60_set_auth_rate_limits_updated_at
before update on public.auth_rate_limits
for each row
execute function public.tre60_set_auth_rate_limits_updated_at();

create or replace function public.tre60_auth_rate_limit_status(
  p_scope text,
  p_key text
)
returns table (
  is_blocked boolean,
  retry_after_seconds integer,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key_hash text := encode(digest(p_key, 'sha256'), 'hex');
  v_row public.auth_rate_limits%rowtype;
begin
  select *
  into v_row
  from public.auth_rate_limits arl
  where arl.scope = p_scope
    and arl.key_hash = v_key_hash;

  if not found then
    return query select false, 0, 0;
    return;
  end if;

  if v_row.blocked_until is not null and v_row.blocked_until > timezone('utc', now()) then
    return query
    select
      true,
      greatest(1, ceil(extract(epoch from (v_row.blocked_until - timezone('utc', now()))))::integer),
      v_row.attempt_count;
    return;
  end if;

  return query select false, 0, v_row.attempt_count;
end;
$$;

create or replace function public.tre60_consume_auth_rate_limit(
  p_scope text,
  p_key text,
  p_max_attempts integer,
  p_window_seconds integer,
  p_block_seconds integer
)
returns table (
  is_blocked boolean,
  retry_after_seconds integer,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key_hash text := encode(digest(p_key, 'sha256'), 'hex');
  v_now timestamptz := timezone('utc', now());
  v_row public.auth_rate_limits%rowtype;
  v_attempt_count integer;
  v_blocked_until timestamptz;
begin
  select *
  into v_row
  from public.auth_rate_limits arl
  where arl.scope = p_scope
    and arl.key_hash = v_key_hash
  for update;

  if found and v_row.blocked_until is not null and v_row.blocked_until > v_now then
    return query
    select
      true,
      greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::integer),
      v_row.attempt_count;
    return;
  end if;

  if not found or v_row.window_started_at <= (v_now - make_interval(secs => p_window_seconds)) then
    v_attempt_count := 1;
  else
    v_attempt_count := v_row.attempt_count + 1;
  end if;

  if v_attempt_count >= p_max_attempts then
    v_blocked_until := v_now + make_interval(secs => p_block_seconds);
  else
    v_blocked_until := null;
  end if;

  insert into public.auth_rate_limits (
    scope,
    key_hash,
    attempt_count,
    window_started_at,
    blocked_until
  )
  values (
    p_scope,
    v_key_hash,
    v_attempt_count,
    v_now,
    v_blocked_until
  )
  on conflict (scope, key_hash) do update
  set
    attempt_count = excluded.attempt_count,
    window_started_at = excluded.window_started_at,
    blocked_until = excluded.blocked_until;

  return query
  select
    v_blocked_until is not null,
    case
      when v_blocked_until is null then 0
      else greatest(1, ceil(extract(epoch from (v_blocked_until - v_now)))::integer)
    end,
    v_attempt_count;
end;
$$;

create or replace function public.tre60_clear_auth_rate_limit(
  p_scope text,
  p_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key_hash text := encode(digest(p_key, 'sha256'), 'hex');
begin
  delete from public.auth_rate_limits
  where scope = p_scope
    and key_hash = v_key_hash;
end;
$$;

create or replace function public.tre60_log_auth_security_event(
  p_event_type text,
  p_outcome text,
  p_identifier text default null,
  p_ip inet default null,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.auth_security_events (
    event_type,
    outcome,
    identifier_hash,
    ip,
    user_agent_hash,
    metadata
  )
  values (
    p_event_type,
    p_outcome,
    case when p_identifier is null then null else encode(digest(lower(p_identifier), 'sha256'), 'hex') end,
    p_ip,
    case when p_user_agent is null then null else encode(digest(p_user_agent, 'sha256'), 'hex') end,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;
