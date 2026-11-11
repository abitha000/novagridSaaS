-- Phase 7: tenant-scoped gym trainer profiles.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path = '' as $$ select 14 $$;

create table public.gym_trainers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organisations(id) on delete cascade,
  contact_id uuid not null,
  specialty text not null check (char_length(specialty) between 2 and 120),
  bio text check (bio is null or char_length(bio) <= 500),
  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, contact_id),
  foreign key (tenant_id,contact_id) references public.contacts(tenant_id,id)
);
create index gym_trainers_tenant_status on public.gym_trainers(tenant_id,status);
create trigger gym_trainers_updated before update on public.gym_trainers
for each row execute function private.set_updated_at();
alter table public.gym_trainers enable row level security;
alter table public.gym_trainers force row level security;
revoke all on public.gym_trainers from anon, authenticated;
grant select,insert,update on public.gym_trainers to authenticated;
create policy gym_trainers_read on public.gym_trainers for select to authenticated
 using (private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'gym.trainers'));
create policy gym_trainers_insert on public.gym_trainers for insert to authenticated
 with check (private.has_permission(tenant_id,'contacts.create') and private.has_module_access(tenant_id,'gym.trainers')
   and private.is_writable(tenant_id) and created_by=auth.uid());
create policy gym_trainers_update on public.gym_trainers for update to authenticated
 using (private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'gym.trainers') and private.is_writable(tenant_id))
 with check (private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'gym.trainers') and private.is_writable(tenant_id));
