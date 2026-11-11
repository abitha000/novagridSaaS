-- NOVAGRID commercial pricing catalogue (initial proposed India launch rates).
-- Prices are editable platform configuration, not hard-coded billing logic.
-- Messaging delivery is deliberately usage-billed separately from SaaS subscription fees.

create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path = '' as $$ select 10 $$;

-- Expand supported add-on keys while preserving existing subscriptions.
alter table public.subscription_addons
  drop constraint if exists subscription_addons_addon_key_check;
alter table public.subscription_addons
  add constraint subscription_addons_addon_key_check
  check (addon_key in (
    'white_label', 'extra_messages', 'extra_storage',
    'extra_staff', 'extra_contacts', 'advanced_analytics'
  ));

create table if not exists public.subscription_addon_catalogue (
  addon_key text primary key,
  name text not null,
  description text not null,
  price_inr_monthly integer not null check (price_inr_monthly >= 0),
  unit_label text not null,
  unit_quantity integer not null default 1 check (unit_quantity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.subscription_addon_catalogue
  (addon_key, name, description, price_inr_monthly, unit_label, unit_quantity)
values
  ('white_label', 'White-label branding', 'Organisation logo, colours and custom domain', 999, 'workspace', 1),
  ('extra_messages', 'Additional messaging credits', 'Messaging provider charges are billed separately; this add-on covers platform allowance only', 199, 'credit_pack', 1000),
  ('extra_storage', 'Additional storage', 'Additional file storage capacity', 199, 'GB', 5),
  ('extra_staff', 'Additional staff seats', 'Five additional staff accounts', 199, 'staff_seats', 5),
  ('extra_contacts', 'Additional people capacity', 'Additional 100 active members or students', 199, 'people', 100),
  ('advanced_analytics', 'Advanced analytics', 'Advanced operational reports and exports', 499, 'workspace', 1)
on conflict (addon_key) do update set
  name = excluded.name,
  description = excluded.description,
  price_inr_monthly = excluded.price_inr_monthly,
  unit_label = excluded.unit_label,
  unit_quantity = excluded.unit_quantity,
  active = true;

-- Keep the original generic sample plans for backward compatibility, but mark them inactive.
update public.subscription_plans
set active = false
where key in ('basic', 'pro', 'ent');

-- Six industry-specific launch plans. Annual pricing equals ten monthly payments (two months free).
with plan_data(key, tier, name, industry_key, monthly, yearly, limits) as (
  values
    ('gym_starter', 'basic', 'Starter', 'gym', 799, 7990,
      '{"staff":2,"active_members":100,"storage_mb":2048,"locations":1}'::jsonb),
    ('gym_growth', 'professional', 'Growth', 'gym', 1499, 14990,
      '{"staff":5,"active_members":300,"storage_mb":10240,"locations":1}'::jsonb),
    ('gym_pro', 'professional', 'Pro', 'gym', 2499, 24990,
      '{"staff":15,"active_members":1000,"storage_mb":20480,"locations":3}'::jsonb),
    ('education_starter', 'basic', 'Starter', 'education', 1499, 14990,
      '{"staff":5,"active_students":200,"storage_mb":5120,"locations":1}'::jsonb),
    ('education_growth', 'professional', 'Growth', 'education', 2999, 29990,
      '{"staff":15,"active_students":750,"storage_mb":20480,"locations":3}'::jsonb),
    ('education_pro', 'professional', 'Pro', 'education', 5999, 59990,
      '{"staff":40,"active_students":2000,"storage_mb":51200,"locations":5}'::jsonb)
)
insert into public.subscription_plans
  (key, tier, name, industry_category_id, price_inr_monthly, price_inr_yearly, limits, is_sample, active)
select
  p.key, p.tier, p.name, c.id, p.monthly, p.yearly, p.limits, false, true
from plan_data p
join public.industry_categories c on c.key = p.industry_key
on conflict (key) do update set
  tier = excluded.tier,
  name = excluded.name,
  industry_category_id = excluded.industry_category_id,
  price_inr_monthly = excluded.price_inr_monthly,
  price_inr_yearly = excluded.price_inr_yearly,
  limits = excluded.limits,
  is_sample = false,
  active = true;

-- Entitlements are scoped to each plan's own industry; no cross-industry module access.
with entitlement_data(plan_key, module_key, features) as (
  values
    ('gym_starter','core.org','{}'::jsonb),
    ('gym_starter','core.staff','{}'::jsonb),
    ('gym_starter','core.contacts','{}'::jsonb),
    ('gym_starter','core.notify','{}'::jsonb),
    ('gym_starter','core.billing','{}'::jsonb),
    ('gym_starter','core.reports','{"level":"basic"}'::jsonb),
    ('gym_starter','gym.members','{"limit_key":"active_members"}'::jsonb),
    ('gym_starter','gym.memberships','{}'::jsonb),
    ('gym_starter','gym.attendance','{}'::jsonb),
    ('gym_growth','core.org','{}'::jsonb),
    ('gym_growth','core.staff','{}'::jsonb),
    ('gym_growth','core.contacts','{}'::jsonb),
    ('gym_growth','core.notify','{}'::jsonb),
    ('gym_growth','core.billing','{}'::jsonb),
    ('gym_growth','core.reports','{"level":"advanced"}'::jsonb),
    ('gym_growth','core.workflow','{}'::jsonb),
    ('gym_growth','gym.members','{"limit_key":"active_members"}'::jsonb),
    ('gym_growth','gym.memberships','{}'::jsonb),
    ('gym_growth','gym.attendance','{}'::jsonb),
    ('gym_growth','gym.trainers','{}'::jsonb),
    ('gym_growth','gym.renewals','{}'::jsonb),
    ('gym_pro','core.org','{}'::jsonb),
    ('gym_pro','core.staff','{}'::jsonb),
    ('gym_pro','core.contacts','{}'::jsonb),
    ('gym_pro','core.notify','{}'::jsonb),
    ('gym_pro','core.billing','{}'::jsonb),
    ('gym_pro','core.reports','{"level":"advanced"}'::jsonb),
    ('gym_pro','core.workflow','{}'::jsonb),
    ('gym_pro','core.audit','{}'::jsonb),
    ('gym_pro','core.export','{}'::jsonb),
    ('gym_pro','gym.members','{"limit_key":"active_members"}'::jsonb),
    ('gym_pro','gym.memberships','{}'::jsonb),
    ('gym_pro','gym.attendance','{}'::jsonb),
    ('gym_pro','gym.trainers','{}'::jsonb),
    ('gym_pro','gym.renewals','{}'::jsonb),
    ('education_starter','core.org','{}'::jsonb),
    ('education_starter','core.staff','{}'::jsonb),
    ('education_starter','core.contacts','{}'::jsonb),
    ('education_starter','core.notify','{}'::jsonb),
    ('education_starter','core.billing','{}'::jsonb),
    ('education_starter','core.reports','{"level":"basic"}'::jsonb),
    ('education_starter','edu.students','{"limit_key":"active_students"}'::jsonb),
    ('education_starter','edu.guardians','{}'::jsonb),
    ('education_starter','edu.classes','{}'::jsonb),
    ('education_starter','edu.attendance','{}'::jsonb),
    ('education_starter','edu.fees','{}'::jsonb),
    ('education_growth','core.org','{}'::jsonb),
    ('education_growth','core.staff','{}'::jsonb),
    ('education_growth','core.contacts','{}'::jsonb),
    ('education_growth','core.notify','{}'::jsonb),
    ('education_growth','core.billing','{}'::jsonb),
    ('education_growth','core.reports','{"level":"advanced"}'::jsonb),
    ('education_growth','core.workflow','{}'::jsonb),
    ('education_growth','edu.students','{"limit_key":"active_students"}'::jsonb),
    ('education_growth','edu.guardians','{}'::jsonb),
    ('education_growth','edu.classes','{}'::jsonb),
    ('education_growth','edu.attendance','{}'::jsonb),
    ('education_growth','edu.fees','{}'::jsonb),
    ('education_growth','edu.transport','{}'::jsonb),
    ('education_growth','edu.timetables','{}'::jsonb),
    ('education_pro','core.org','{}'::jsonb),
    ('education_pro','core.staff','{}'::jsonb),
    ('education_pro','core.contacts','{}'::jsonb),
    ('education_pro','core.notify','{}'::jsonb),
    ('education_pro','core.billing','{}'::jsonb),
    ('education_pro','core.reports','{"level":"advanced"}'::jsonb),
    ('education_pro','core.workflow','{}'::jsonb),
    ('education_pro','core.audit','{}'::jsonb),
    ('education_pro','core.export','{}'::jsonb),
    ('education_pro','edu.students','{"limit_key":"active_students"}'::jsonb),
    ('education_pro','edu.guardians','{}'::jsonb),
    ('education_pro','edu.classes','{}'::jsonb),
    ('education_pro','edu.attendance','{}'::jsonb),
    ('education_pro','edu.fees','{}'::jsonb),
    ('education_pro','edu.transport','{}'::jsonb),
    ('education_pro','edu.timetables','{}'::jsonb),
    ('education_pro','edu.exams','{}'::jsonb)
)
insert into public.plan_entitlements (plan_id, module_id, features)
select p.id, m.id, e.features
from entitlement_data e
join public.subscription_plans p on p.key = e.plan_key
join public.module_catalogue m on m.key = e.module_key
on conflict (plan_id, module_id) do update set features = excluded.features;

-- This catalogue is platform configuration. RLS and platform-only write policies are
-- established in the core security migration; no tenant receives write access here.
