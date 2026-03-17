create or replace function public.tre60_session_aal()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1')
$$;

create or replace function public.tre60_has_verified_mfa()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.mfa_factors mf
    where mf.user_id = auth.uid()
      and mf.status = 'verified'
  )
$$;

create or replace function public.tre60_mfa_required()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.tre60_role() in ('admin', 'employee'), false)
$$;

create or replace function public.tre60_mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.tre60_mfa_required() then true
    else public.tre60_session_aal() = 'aal2'
  end
$$;

create or replace function public.tre60_auth_security_context()
returns table (
  user_id uuid,
  role public.tre60_role,
  status public.tre60_user_status,
  session_aal text,
  has_verified_mfa boolean,
  mfa_required boolean,
  mfa_satisfied boolean
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
    public.tre60_session_aal() as session_aal,
    public.tre60_has_verified_mfa() as has_verified_mfa,
    public.tre60_mfa_required() as mfa_required,
    public.tre60_mfa_satisfied() as mfa_satisfied
$$;

grant execute on function public.tre60_session_aal() to authenticated;
grant execute on function public.tre60_has_verified_mfa() to authenticated;
grant execute on function public.tre60_mfa_required() to authenticated;
grant execute on function public.tre60_mfa_satisfied() to authenticated;
grant execute on function public.tre60_auth_security_context() to authenticated;
