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
        and cm.role in ('employee', 'member')
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
