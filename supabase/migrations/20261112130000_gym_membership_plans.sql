-- Phase 12: reusable gym membership plan catalogue.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path = '' as $$ select 19 $$;

create table public.gym_membership_plans (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.organisations(id) on delete cascade,
 name text not null check(char_length(name) between 2 and 100),
 duration_days integer not null check(duration_days between 1 and 1095),
 price_paise bigint not null check(price_paise>=0 and price_paise<=100000000000),
 description text check(description is null or char_length(description)<=500),
 is_active boolean not null default true,
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,id),
 unique(tenant_id,name)
);
create index gym_membership_plans_tenant_active on public.gym_membership_plans(tenant_id,is_active,name);
create trigger gym_membership_plans_updated before update on public.gym_membership_plans
for each row execute function private.set_updated_at();
alter table public.gym_membership_plans enable row level security;
alter table public.gym_membership_plans force row level security;
revoke all on public.gym_membership_plans from anon,authenticated;
grant select,insert,update on public.gym_membership_plans to authenticated;
create policy gym_membership_plans_read on public.gym_membership_plans for select to authenticated
 using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'gym.memberships'));
create policy gym_membership_plans_insert on public.gym_membership_plans for insert to authenticated
 with check(private.has_permission(tenant_id,'contacts.create') and private.has_module_access(tenant_id,'gym.memberships') and private.is_writable(tenant_id) and created_by=auth.uid());
create policy gym_membership_plans_update on public.gym_membership_plans for update to authenticated
 using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'gym.memberships') and private.is_writable(tenant_id))
 with check(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'gym.memberships') and private.is_writable(tenant_id));
