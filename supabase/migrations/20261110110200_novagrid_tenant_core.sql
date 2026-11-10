-- NOVAGRID tenant core schema. Standard Supabase migration.
create or replace function public.novagrid_schema_version() returns integer language sql stable set search_path = '' as $$ select 3 $$;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.organisations(id) on delete cascade,   -- null = system role
  key text not null,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);
create unique index roles_key_unique on public.roles (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), key);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z_]+\.[a-z_]+$'),
  module_key text not null,
  action text not null
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  resource_scope jsonb not null default '{}',     -- optional restriction, e.g. {"branch_ids":[...]}
  primary key (role_id, permission_id)
);

create table public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  full_name text,
  email text,
  status text not null default 'active' check (status in ('invited','active','disabled')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  unique (tenant_id, id)
);
create index on public.tenant_users (user_id);

-- A staff membership may use a global system role or a role owned by that same tenant only.
create or replace function private.enforce_tenant_role_scope() returns trigger
language plpgsql set search_path = '' as $
declare v_role_tenant uuid;
begin
  select tenant_id into v_role_tenant from public.roles where id = new.role_id;
  if not found then
    raise exception 'role does not exist' using errcode = '23503';
  end if;
  if v_role_tenant is not null and v_role_tenant <> new.tenant_id then
    raise exception 'staff role belongs to a different organisation' using errcode = '23514';
  end if;
  return new;
end $;
create trigger tenant_users_role_scope
before insert or update of tenant_id, role_id on public.tenant_users
for each row execute function private.enforce_tenant_role_scope();
create trigger tenant_users_updated before update on public.tenant_users for each row execute function private.set_updated_at();

-- The last active owner of an organisation can never be removed, demoted or disabled.
create or replace function private.protect_last_owner() returns trigger language plpgsql set search_path = '' as $$
declare owner_role uuid; remaining int;
begin
  -- allow cascades from deleting the whole organisation
  if tg_op = 'DELETE' and not exists (select 1 from public.organisations where id = old.tenant_id) then return old; end if;
  select id into owner_role from public.roles where tenant_id is null and key = 'owner';
  if old.role_id = owner_role and old.status = 'active'
     and (tg_op = 'DELETE' or (new.role_id is distinct from owner_role or new.status is distinct from 'active')) then
    select count(*) into remaining from public.tenant_users
      where tenant_id = old.tenant_id and role_id = owner_role and status = 'active' and id <> old.id;
    if remaining = 0 then raise exception 'an organisation must keep at least one active owner' using errcode = '23514'; end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger tenant_users_last_owner before update or delete on public.tenant_users for each row execute function private.protect_last_owner();

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organisations(id) on delete cascade,
  type text not null default 'person',                     -- member, student, parent, patient, guest ...
  full_name text not null check (char_length(full_name) between 2 and 160),
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (email ~ '^\S+@\S+\.\S+$'),
  attributes jsonb not null default '{}',
  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id)
);
create unique index contacts_phone_unique on public.contacts (tenant_id, phone_e164) where phone_e164 is not null and deleted_at is null;
create index on public.contacts (tenant_id, created_at desc);
create index on public.contacts (tenant_id, lower(full_name));
create trigger contacts_updated before update on public.contacts for each row execute function private.set_updated_at();

create table public.communication_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid not null,
  channel text not null check (channel in ('whatsapp','sms','email')),
  consent_status text not null default 'unknown' check (consent_status in ('opted_in','opted_out','unknown')),
  consent_source text,
  consented_at timestamptz,
  revoked_at timestamptz,
  quiet_hours jsonb,
  updated_at timestamptz not null default now(),
  unique (tenant_id, contact_id, channel),
  foreign key (tenant_id, contact_id) references public.contacts (tenant_id, id) on delete cascade
);

-- Append-only consent ledger (who consented, when, from where). Required for WhatsApp opt-in and DPDP.
create table public.consent_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  contact_id uuid not null,
  channel text not null check (channel in ('whatsapp','sms','email')),
  consent_status text not null check (consent_status in ('opted_in','opted_out')),
  source text not null,
  recorded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, contact_id) references public.contacts (tenant_id, id) on delete cascade
);
create index on public.consent_events (tenant_id, contact_id, created_at desc);
