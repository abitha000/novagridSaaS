-- Phase 5: tenant-scoped gym membership lifecycle records.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path = '' as $$ select 12 $$;

create table public.gym_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organisations(id) on delete cascade,
  contact_id uuid not null,
  plan_name text not null check (char_length(plan_name) between 2 and 100),
  start_date date not null,
  end_date date not null,
  amount_paise bigint not null default 0 check (amount_paise >= 0 and amount_paise <= 100000000000),
  status text not null default 'active' check (status in ('active','paused','cancelled')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  foreign key (tenant_id,contact_id) references public.contacts(tenant_id,id),
  check (end_date >= start_date)
);
create index gym_memberships_tenant_dates on public.gym_memberships(tenant_id,end_date desc);
create index gym_memberships_contact on public.gym_memberships(tenant_id,contact_id,start_date desc);
create trigger gym_memberships_updated before update on public.gym_memberships
for each row execute function private.set_updated_at();

alter table public.gym_memberships enable row level security;
alter table public.gym_memberships force row level security;
revoke all on public.gym_memberships from anon, authenticated;
grant select,insert,update on public.gym_memberships to authenticated;
create policy gym_memberships_read on public.gym_memberships for select to authenticated
 using (private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'gym.memberships'));
create policy gym_memberships_insert on public.gym_memberships for insert to authenticated
 with check (private.has_permission(tenant_id,'contacts.create') and private.has_module_access(tenant_id,'gym.memberships')
   and private.is_writable(tenant_id) and created_by=auth.uid());
create policy gym_memberships_update on public.gym_memberships for update to authenticated
 using (private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'gym.memberships') and private.is_writable(tenant_id))
 with check (private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'gym.memberships') and private.is_writable(tenant_id));
