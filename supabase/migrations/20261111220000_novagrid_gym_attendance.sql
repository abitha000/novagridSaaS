-- Phase 6: tenant-scoped gym attendance.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path = '' as $$ select 13 $$;

create table public.gym_attendance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organisations(id) on delete cascade,
  contact_id uuid not null,
  attendance_date date not null default current_date,
  status text not null check (status in ('present','late','absent')),
  marked_by uuid not null default auth.uid(),
  marked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tenant_id, contact_id, attendance_date),
  foreign key (tenant_id, contact_id) references public.contacts(tenant_id,id)
);
create index gym_attendance_tenant_date on public.gym_attendance(tenant_id, attendance_date desc);
alter table public.gym_attendance enable row level security;
alter table public.gym_attendance force row level security;
revoke all on public.gym_attendance from anon, authenticated;
grant select, insert, update on public.gym_attendance to authenticated;
create policy gym_attendance_read on public.gym_attendance for select to authenticated
 using (private.has_permission(tenant_id,'contacts.view'));
create policy gym_attendance_write on public.gym_attendance for insert to authenticated
 with check (private.has_permission(tenant_id,'contacts.edit') and private.is_writable(tenant_id) and marked_by=auth.uid());
create policy gym_attendance_update on public.gym_attendance for update to authenticated
 using (private.has_permission(tenant_id,'contacts.edit') and private.is_writable(tenant_id))
 with check (private.has_permission(tenant_id,'contacts.edit') and private.is_writable(tenant_id) and marked_by=auth.uid());
