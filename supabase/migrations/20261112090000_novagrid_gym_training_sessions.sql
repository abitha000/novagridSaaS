-- Phase 8: tenant-scoped gym personal-training sessions.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path = '' as $$ select 15 $$;

create table public.gym_training_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organisations(id) on delete cascade,
  trainer_id uuid not null,
  member_contact_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  session_type text not null default 'Personal training' check (char_length(session_type) between 2 and 100),
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id,trainer_id) references public.gym_trainers(tenant_id,id),
  foreign key (tenant_id,member_contact_id) references public.contacts(tenant_id,id),
  check (ends_at > starts_at)
);
create index gym_training_sessions_tenant_start on public.gym_training_sessions(tenant_id,starts_at);
create index gym_training_sessions_trainer_start on public.gym_training_sessions(tenant_id,trainer_id,starts_at);
create trigger gym_training_sessions_updated before update on public.gym_training_sessions
for each row execute function private.set_updated_at();
alter table public.gym_training_sessions enable row level security;
alter table public.gym_training_sessions force row level security;
revoke all on public.gym_training_sessions from anon, authenticated;
grant select,insert,update on public.gym_training_sessions to authenticated;
create policy gym_training_sessions_read on public.gym_training_sessions for select to authenticated
 using (private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'gym.trainers'));
create policy gym_training_sessions_insert on public.gym_training_sessions for insert to authenticated
 with check (private.has_permission(tenant_id,'contacts.create') and private.has_module_access(tenant_id,'gym.trainers')
   and private.is_writable(tenant_id) and created_by=auth.uid());
create policy gym_training_sessions_update on public.gym_training_sessions for update to authenticated
 using (private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'gym.trainers') and private.is_writable(tenant_id))
 with check (private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'gym.trainers') and private.is_writable(tenant_id));
