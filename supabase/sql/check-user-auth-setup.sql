-- Kontroll för att verifiera att en användare är korrekt uppsatt i Supabase.
-- Kör i Supabase SQL Editor och byt ut e-postadressen i första raden.

with input as (
  select lower(trim('employee@tre60grader.se'))::text as email
),
target_user as (
  select
    u.id,
    lower(u.email) as email,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.created_at,
    u.raw_user_meta_data
  from auth.users u
  join input i on lower(u.email) = i.email
),
profile_data as (
  select
    p.id,
    p.email,
    p.full_name,
    p.status,
    p.default_company_id,
    p.created_at,
    p.updated_at
  from public.profiles p
  join target_user u on u.id = p.id
),
company_memberships as (
  select
    cm.user_id,
    cm.company_id,
    c.name as company_name,
    cm.role,
    cm.created_at
  from public.company_members cm
  join public.companies c on c.id = cm.company_id
  join target_user u on u.id = cm.user_id
),
customer_links as (
  select
    cu.user_id,
    cu.customer_id,
    cu.status,
    cu.is_primary,
    cu.created_at,
    cu.updated_at,
    cust.name as customer_name,
    cust.company_id,
    comp.name as company_name
  from public.customer_users cu
  join public.customers cust on cust.id = cu.customer_id
  join public.companies comp on comp.id = cust.company_id
  join target_user u on u.id = cu.user_id
),
mfa_factors as (
  select
    mf.id,
    mf.user_id,
    mf.factor_type,
    mf.status,
    mf.friendly_name,
    mf.created_at,
    mf.updated_at
  from auth.mfa_factors mf
  join target_user u on u.id = mf.user_id
),
derived_access as (
  select
    u.id as user_id,
    case
      when exists (
        select 1
        from company_memberships cm
        where cm.role = 'admin'
      ) then 'admin'
      when exists (
        select 1
        from company_memberships cm
        where cm.role in ('employee', 'member')
      ) then 'employee'
      when exists (
        select 1
        from customer_links cu
        where cu.status = 'active'
      ) then 'customer'
      else null
    end as derived_role,
    coalesce((select pd.status from profile_data pd limit 1), null) as profile_status,
    exists (
      select 1
      from mfa_factors mf
      where mf.status = 'verified'
    ) as has_verified_mfa
  from target_user u
),
checks as (
  select
    i.email,
    exists (select 1 from target_user) as exists_in_auth_users,
    exists (select 1 from profile_data) as exists_in_profiles,
    exists (select 1 from company_memberships) as has_company_membership,
    exists (select 1 from customer_links) as has_customer_link,
    exists (select 1 from mfa_factors) as has_any_mfa_factor,
    coalesce((select has_verified_mfa from derived_access limit 1), false) as has_verified_mfa,
    coalesce((select derived_role from derived_access limit 1), null) as derived_role,
    coalesce((select profile_status from derived_access limit 1), null) as profile_status,
    (
      exists (select 1 from target_user)
      and exists (select 1 from profile_data)
      and coalesce((select profile_status from derived_access limit 1), null) = 'active'
      and coalesce((select derived_role from derived_access limit 1), null) is not null
    ) as can_reach_app_selection
  from input i
)
select
  'summary' as section,
  jsonb_build_object(
    'email', c.email,
    'exists_in_auth_users', c.exists_in_auth_users,
    'exists_in_profiles', c.exists_in_profiles,
    'has_company_membership', c.has_company_membership,
    'has_customer_link', c.has_customer_link,
    'has_any_mfa_factor', c.has_any_mfa_factor,
    'has_verified_mfa', c.has_verified_mfa,
    'derived_role', c.derived_role,
    'profile_status', c.profile_status,
    'can_reach_app_selection', c.can_reach_app_selection,
    'notes', jsonb_strip_nulls(
      jsonb_build_object(
        'auth_user_missing', case when not c.exists_in_auth_users then 'Saknas i auth.users' end,
        'profile_missing', case when c.exists_in_auth_users and not c.exists_in_profiles then 'Saknas i public.profiles' end,
        'inactive_profile', case when c.profile_status is not null and c.profile_status <> 'active' then 'profiles.status är inte active' end,
        'role_missing', case when c.derived_role is null then 'Ingen giltig roll kunde härledas från company_members/customer_users' end,
        'member_compat', case when c.derived_role = 'employee' and exists (select 1 from company_memberships cm where cm.role = 'member') then 'company_members.role = member mappas till intern employee-kompatibilitet i auth-lagret' end,
        'mfa_optional', case when c.derived_role in ('admin', 'employee') and not c.has_verified_mfa then 'Intern användare utan verifierad MFA' end
      )
    )
  ) as data
from checks c

union all

select
  'auth_user' as section,
  to_jsonb(tu.*) as data
from target_user tu

union all

select
  'profile' as section,
  to_jsonb(pd.*) as data
from profile_data pd

union all

select
  'company_membership' as section,
  to_jsonb(cm.*) as data
from company_memberships cm

union all

select
  'customer_link' as section,
  to_jsonb(cl.*) as data
from customer_links cl

union all

select
  'mfa_factor' as section,
  to_jsonb(mf.*) as data
from mfa_factors mf

order by section;
