-- NOVAGRID platform schema. Standard Supabase migration.
create or replace function public.novagrid_schema_version() returns integer language sql stable set search_path = '' as $$ select 2 $$;

create table public.industry_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  terminology jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.platform_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','support')),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now()
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),         -- this is the tenant_id everywhere
  name text not null check (char_length(name) between 2 and 160),
  industry_category_id uuid not null references public.industry_categories(id),
  org_type text,
  owner_name text not null,
  owner_email text not null,
  owner_phone text check (owner_phone ~ '^\+[1-9][0-9]{7,14}$'),
  address text, country text, state text, city text,
  preferred_plan_key text,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  lifecycle_status text not null default 'pending_approval'
    check (lifecycle_status in ('pending_verification','pending_approval','approved','active','suspended','rejected','cancelled')),
  email_verified_at timestamptz,
  phone_verified_at timestamptz,                         -- stays null until an SMS provider is connected
  suspended_at timestamptz,
  created_by uuid not null references auth.users(id),
  registration_token uuid,                               -- makes registration idempotent
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, registration_token)
);
create index on public.organisations (industry_category_id);
create index on public.organisations (approval_status, created_at desc);
create trigger organisations_updated before update on public.organisations for each row execute function private.set_updated_at();

create table public.organisation_approvals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  requested_category_id uuid not null references public.industry_categories(id),
  assigned_category_id uuid references public.industry_categories(id),
  decision text not null default 'pending' check (decision in ('pending','approved','rejected')),
  decided_by uuid references auth.users(id),
  reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.organisation_approvals (organisation_id, created_at desc);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  tier text not null check (tier in ('trial','basic','professional','enterprise')),
  name text not null,
  industry_category_id uuid references public.industry_categories(id),  -- null = available to every category
  price_inr_monthly integer check (price_inr_monthly >= 0),
  price_inr_yearly integer check (price_inr_yearly >= 0),
  limits jsonb not null default '{}',                    -- staff, contacts, messages_per_month, storage_mb
  is_sample boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null check (status in ('trial','active','grace','read_only','suspended','cancelled','expired')),
  period_start timestamptz not null default now(),
  period_end timestamptz not null,
  grace_until timestamptz,
  gateway_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index subscriptions_one_current on public.subscriptions (organisation_id) where status in ('trial','active','grace','read_only');
create index on public.subscriptions (period_end);
create trigger subscriptions_updated before update on public.subscriptions for each row execute function private.set_updated_at();

create table public.subscription_addons (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  addon_key text not null check (addon_key in ('white_label','extra_messages','extra_storage')),
  quantity integer not null default 1 check (quantity > 0),
  unique (subscription_id, addon_key)
);

create table public.module_catalogue (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  scope text not null check (scope in ('core','industry')),
  industry_category_id uuid references public.industry_categories(id),
  check ((scope = 'core' and industry_category_id is null) or (scope = 'industry' and industry_category_id is not null))
);

create table public.plan_entitlements (
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  module_id uuid not null references public.module_catalogue(id) on delete cascade,
  features jsonb not null default '{}',
  primary key (plan_id, module_id)
);

-- A plan tied to one industry can never entitle another industry's module.
create or replace function private.check_entitlement_scope() returns trigger language plpgsql set search_path = '' as $$
declare p uuid; m uuid;
begin
  select industry_category_id into p from public.subscription_plans where id = new.plan_id;
  select industry_category_id into m from public.module_catalogue where id = new.module_id;
  if p is not null and m is not null and p <> m then
    raise exception 'plan and module belong to different industries' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger plan_entitlements_scope before insert or update on public.plan_entitlements for each row execute function private.check_entitlement_scope();

create table public.organisation_settings (
  organisation_id uuid primary key references public.organisations(id) on delete cascade,
  branding jsonb not null default '{}',
  locale text not null default 'en-IN',
  timezone text not null default 'Asia/Kolkata',
  white_label_domain text unique,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.organisations(id) on delete set null,
  actor_id uuid,
  actor_type text not null default 'user' check (actor_type in ('user','platform','system')),
  action text not null,
  entity text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (tenant_id, created_at desc);
create index on public.audit_logs (entity, entity_id);
