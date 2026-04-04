-- Koppla en befintlig auth-användare till ett företag som intern användare.
-- 1. Skapa först användaren i Supabase Auth.
-- 2. Byt ut e-post, företag och roll nedan.
-- 3. Kör scriptet i Supabase SQL Editor.

with input as (
  select
    lower(trim('employee@tre60grader.se'))::text as email,
    '11111111-1111-1111-1111-111111111111'::uuid as company_id,
    'employee'::text as role
),
target_user as (
  select u.id, lower(u.email) as email
  from auth.users u
  join input i on lower(u.email) = i.email
),
updated_profile as (
  update public.profiles p
  set
    email = tu.email,
    status = 'active',
    default_company_id = i.company_id,
    updated_at = timezone('utc', now())
  from target_user tu
  cross join input i
  where p.id = tu.id
  returning p.id
),
upsert_membership as (
  insert into public.company_members (company_id, user_id, role)
  select i.company_id, tu.id, i.role
  from input i
  cross join target_user tu
  on conflict (company_id, user_id) do update
  set role = excluded.role
  returning user_id, company_id, role
)
select
  u.email,
  p.status,
  p.default_company_id,
  cm.role,
  cm.company_id
from target_user u
join public.profiles p on p.id = u.id
join public.company_members cm on cm.user_id = u.id
join input i on i.company_id = cm.company_id
order by cm.company_id;
