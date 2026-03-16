create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'tre60_role'
  ) then
    create type public.tre60_role as enum ('admin', 'employee', 'customer');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'tre60_user_status'
  ) then
    create type public.tre60_user_status as enum ('active', 'invited', 'disabled');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'request_status'
  ) then
    create type public.request_status as enum ('open', 'in_progress', 'resolved', 'closed');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'internal_note_target'
  ) then
    create type public.internal_note_target as enum ('company', 'customer', 'order', 'request');
  end if;
end
$$;

alter table public.companies
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.orders
  add column if not exists customer_id uuid references public.customers (id) on delete set null,
  add column if not exists customer_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists type text,
  add column if not exists currency char(3) not null default 'SEK',
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.order_lines
  add column if not exists description text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_currency_uppercase'
  ) then
    alter table public.orders
      add constraint orders_currency_uppercase
      check (currency = upper(currency));
  end if;
end
$$;

create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_customer_user_id_idx on public.orders (customer_user_id);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  customer_id uuid references public.customers (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete restrict,
  category text not null,
  message text not null,
  status public.request_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint requests_category_not_blank check (btrim(category) <> ''),
  constraint requests_message_not_blank check (btrim(message) <> '')
);

create index if not exists requests_company_id_idx on public.requests (company_id);
create index if not exists requests_customer_id_idx on public.requests (customer_id);
create index if not exists requests_user_id_idx on public.requests (user_id);
create index if not exists requests_status_idx on public.requests (status);

create table if not exists public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  target_type public.internal_note_target not null,
  company_id uuid references public.companies (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete cascade,
  order_id uuid references public.orders (id) on delete cascade,
  request_id uuid references public.requests (id) on delete cascade,
  author_user_id uuid not null references public.profiles (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint internal_notes_body_not_blank check (btrim(body) <> ''),
  constraint internal_notes_target_match check (
    (
      target_type = 'company'
      and company_id is not null
      and customer_id is null
      and order_id is null
      and request_id is null
    ) or (
      target_type = 'customer'
      and company_id is null
      and customer_id is not null
      and order_id is null
      and request_id is null
    ) or (
      target_type = 'order'
      and company_id is null
      and customer_id is null
      and order_id is not null
      and request_id is null
    ) or (
      target_type = 'request'
      and company_id is null
      and customer_id is null
      and order_id is null
      and request_id is not null
    )
  )
);

create index if not exists internal_notes_company_id_idx on public.internal_notes (company_id);
create index if not exists internal_notes_customer_id_idx on public.internal_notes (customer_id);
create index if not exists internal_notes_order_id_idx on public.internal_notes (order_id);
create index if not exists internal_notes_request_id_idx on public.internal_notes (request_id);

create or replace function public.tre60_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists tre60_set_companies_updated_at on public.companies;
create trigger tre60_set_companies_updated_at
before update on public.companies
for each row
execute function public.tre60_set_updated_at();

drop trigger if exists tre60_set_orders_updated_at on public.orders;
create trigger tre60_set_orders_updated_at
before update on public.orders
for each row
execute function public.tre60_set_updated_at();

drop trigger if exists tre60_set_requests_updated_at on public.requests;
create trigger tre60_set_requests_updated_at
before update on public.requests
for each row
execute function public.tre60_set_updated_at();

drop trigger if exists tre60_set_internal_notes_updated_at on public.internal_notes;
create trigger tre60_set_internal_notes_updated_at
before update on public.internal_notes
for each row
execute function public.tre60_set_updated_at();

create or replace function public.tre60_current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cu.customer_id
  from public.customer_users cu
  where cu.user_id = auth.uid()
    and cu.status = 'active'
  order by cu.is_primary desc, cu.created_at asc
  limit 1
$$;

create or replace function public.tre60_current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.default_company_id
  from public.profiles p
  where p.id = auth.uid()
$$;

create or replace function public.tre60_user_status()
returns public.tre60_user_status
language sql
stable
security definer
set search_path = public
as $$
  select case p.status
    when 'active' then 'active'::public.tre60_user_status
    when 'invited' then 'invited'::public.tre60_user_status
    else 'disabled'::public.tre60_user_status
  end
  from public.profiles p
  where p.id = auth.uid()
$$;

create or replace function public.tre60_is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.tre60_user_status() = 'active', false)
$$;

create or replace function public.tre60_role()
returns public.tre60_role
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.company_members cm
      where cm.user_id = auth.uid()
        and cm.role = 'admin'
    ) then 'admin'::public.tre60_role
    when exists (
      select 1
      from public.company_members cm
      where cm.user_id = auth.uid()
        and cm.role = 'employee'
    ) then 'employee'::public.tre60_role
    when exists (
      select 1
      from public.customer_users cu
      where cu.user_id = auth.uid()
        and cu.status = 'active'
    ) then 'customer'::public.tre60_role
    else null
  end
$$;

create or replace function public.tre60_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.tre60_role() = 'admin', false)
$$;

create or replace function public.tre60_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.tre60_role() in ('admin', 'employee'), false)
$$;

create or replace function public.tre60_is_customer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.tre60_role() = 'customer', false)
$$;

create or replace function public.tre60_can_access_customer(target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when not public.tre60_is_active_user() then false
    when public.tre60_is_staff() then exists (
      select 1
      from public.customers c
      where c.id = target_customer_id
        and public.is_company_member(c.company_id)
    )
    else exists (
      select 1
      from public.customer_users cu
      where cu.user_id = auth.uid()
        and cu.customer_id = target_customer_id
        and cu.status = 'active'
    )
  end
$$;

create or replace function public.tre60_can_access_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = target_order_id
      and (
        (
          public.tre60_is_staff()
          and public.tre60_is_active_user()
          and public.is_company_member(o.company_id)
        ) or (
          public.tre60_is_customer()
          and public.tre60_is_active_user()
          and (
            o.customer_user_id = auth.uid()
            or (
              o.customer_id is not null
              and public.tre60_can_access_customer(o.customer_id)
            )
          )
        )
      )
  )
$$;

create or replace function public.tre60_auth_context()
returns table (
  user_id uuid,
  role public.tre60_role,
  status public.tre60_user_status,
  default_company_id uuid,
  customer_id uuid,
  redirect_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() as user_id,
    public.tre60_role() as role,
    public.tre60_user_status() as status,
    public.tre60_current_company_id() as default_company_id,
    public.tre60_current_customer_id() as customer_id,
    case
      when public.tre60_user_status() <> 'active' then null
      when public.tre60_role() = 'customer' then 'https://portal.tre60grader.se'
      when public.tre60_role() in ('admin', 'employee') then 'https://intra.tre60grader.se'
      else null
    end as redirect_url
$$;

grant execute on function public.tre60_current_customer_id() to authenticated;
grant execute on function public.tre60_current_company_id() to authenticated;
grant execute on function public.tre60_user_status() to authenticated;
grant execute on function public.tre60_is_active_user() to authenticated;
grant execute on function public.tre60_role() to authenticated;
grant execute on function public.tre60_is_admin() to authenticated;
grant execute on function public.tre60_is_staff() to authenticated;
grant execute on function public.tre60_is_customer() to authenticated;
grant execute on function public.tre60_can_access_customer(uuid) to authenticated;
grant execute on function public.tre60_can_access_order(uuid) to authenticated;
grant execute on function public.tre60_auth_context() to authenticated;

grant select, insert, update, delete on public.requests to authenticated;
grant select, insert, update, delete on public.internal_notes to authenticated;

alter table public.requests enable row level security;
alter table public.internal_notes enable row level security;
alter table public.requests force row level security;
alter table public.internal_notes force row level security;

drop policy if exists orders_select_customer on public.orders;
create policy orders_select_customer
on public.orders
for select
to authenticated
using (public.tre60_can_access_order(id));

drop policy if exists order_lines_select_customer on public.order_lines;
create policy order_lines_select_customer
on public.order_lines
for select
to authenticated
using (public.tre60_can_access_order(order_id));

drop policy if exists requests_select_accessible on public.requests;
create policy requests_select_accessible
on public.requests
for select
to authenticated
using (
  public.tre60_is_active_user()
  and (
    (
      public.tre60_is_staff()
      and public.is_company_member(company_id)
    ) or (
      public.tre60_is_customer()
      and customer_id is not null
      and public.tre60_can_access_customer(customer_id)
    ) or user_id = auth.uid()
  )
);

drop policy if exists requests_insert_customer_or_staff on public.requests;
create policy requests_insert_customer_or_staff
on public.requests
for insert
to authenticated
with check (
  public.tre60_is_active_user()
  and (
    (
      public.tre60_is_staff()
      and public.is_company_member(company_id)
    ) or (
      public.tre60_is_customer()
      and user_id = auth.uid()
      and customer_id is not null
      and public.tre60_can_access_customer(customer_id)
      and exists (
        select 1
        from public.customers c
        where c.id = customer_id
          and c.company_id = requests.company_id
      )
    )
  )
);

drop policy if exists requests_update_staff_only on public.requests;
create policy requests_update_staff_only
on public.requests
for update
to authenticated
using (
  public.tre60_is_staff()
  and public.tre60_is_active_user()
  and public.is_company_member(company_id)
)
with check (
  public.tre60_is_staff()
  and public.tre60_is_active_user()
  and public.is_company_member(company_id)
);

drop policy if exists requests_delete_admin_only on public.requests;
create policy requests_delete_admin_only
on public.requests
for delete
to authenticated
using (
  public.tre60_is_admin()
  and public.tre60_is_active_user()
  and public.is_company_member(company_id)
);

drop policy if exists internal_notes_select_staff_only on public.internal_notes;
create policy internal_notes_select_staff_only
on public.internal_notes
for select
to authenticated
using (
  public.tre60_is_staff()
  and public.tre60_is_active_user()
  and (
    (company_id is not null and public.is_company_member(company_id))
    or (
      customer_id is not null
      and exists (
        select 1
        from public.customers c
        where c.id = customer_id
          and public.is_company_member(c.company_id)
      )
    ) or (
      order_id is not null
      and exists (
        select 1
        from public.orders o
        where o.id = order_id
          and public.is_company_member(o.company_id)
      )
    ) or (
      request_id is not null
      and exists (
        select 1
        from public.requests r
        where r.id = request_id
          and public.is_company_member(r.company_id)
      )
    )
  )
);

drop policy if exists internal_notes_insert_staff_only on public.internal_notes;
create policy internal_notes_insert_staff_only
on public.internal_notes
for insert
to authenticated
with check (
  public.tre60_is_staff()
  and public.tre60_is_active_user()
  and author_user_id = auth.uid()
  and (
    (company_id is not null and public.is_company_member(company_id))
    or (
      customer_id is not null
      and exists (
        select 1
        from public.customers c
        where c.id = customer_id
          and public.is_company_member(c.company_id)
      )
    ) or (
      order_id is not null
      and exists (
        select 1
        from public.orders o
        where o.id = order_id
          and public.is_company_member(o.company_id)
      )
    ) or (
      request_id is not null
      and exists (
        select 1
        from public.requests r
        where r.id = request_id
          and public.is_company_member(r.company_id)
      )
    )
  )
);

drop policy if exists internal_notes_update_staff_only on public.internal_notes;
create policy internal_notes_update_staff_only
on public.internal_notes
for update
to authenticated
using (
  public.tre60_is_staff()
  and public.tre60_is_active_user()
)
with check (
  public.tre60_is_staff()
  and public.tre60_is_active_user()
);

drop policy if exists internal_notes_delete_admin_only on public.internal_notes;
create policy internal_notes_delete_admin_only
on public.internal_notes
for delete
to authenticated
using (
  public.tre60_is_admin()
  and public.tre60_is_active_user()
);
