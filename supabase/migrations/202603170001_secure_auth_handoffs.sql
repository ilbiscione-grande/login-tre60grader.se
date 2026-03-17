create table if not exists public.auth_handoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_app text not null,
  role public.tre60_role not null,
  redirect_path text not null default '/',
  secret_hash text not null unique,
  payload_ciphertext text not null,
  payload_iv text not null,
  payload_auth_tag text not null,
  created_ip inet,
  created_user_agent_hash text,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint auth_handoffs_target_app_check check (target_app in ('portal', 'intra')),
  constraint auth_handoffs_redirect_path_check check (
    redirect_path like '/%'
    and redirect_path not like '//%'
  )
);

create index if not exists auth_handoffs_user_id_idx on public.auth_handoffs (user_id);
create index if not exists auth_handoffs_target_app_idx on public.auth_handoffs (target_app);
create index if not exists auth_handoffs_expires_at_idx on public.auth_handoffs (expires_at);
create index if not exists auth_handoffs_consumed_at_idx on public.auth_handoffs (consumed_at);

alter table public.auth_handoffs enable row level security;
alter table public.auth_handoffs force row level security;
