-- Enforce tenant storage quotas at the Supabase Storage database boundary.
-- Files must be stored as: <organisation-uuid>/<module>/<filename>
-- The private bucket is created here; no public file URLs are enabled.

insert into storage.buckets (id, name, public)
values ('novagrid-files', 'novagrid-files', false)
on conflict (id) do update set public = false;

create or replace function private.enforce_tenant_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant uuid;
  plan_limits jsonb;
  v_subscription_id uuid;
  base_limit_bytes bigint;
  addon_limit_bytes bigint := 0;
  current_usage_bytes bigint := 0;
  incoming_bytes bigint := 0;
  excluded_object_id uuid := null;
begin
  if new.bucket_id <> 'novagrid-files' then
    return new;
  end if;

  if split_part(new.name, '/', 1) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'file path must begin with an organisation UUID' using errcode = '22023';
  end if;
  tenant := split_part(new.name, '/', 1)::uuid;

  if coalesce(new.metadata->>'size', '') !~ '^[0-9]+$' then
    raise exception 'file size metadata is required for storage quota enforcement' using errcode = '22023';
  end if;
  incoming_bytes := (new.metadata->>'size')::bigint;
  if tg_op = 'UPDATE' then excluded_object_id := old.id; end if;

  -- Serialize writes for a tenant so concurrent uploads cannot overshoot the quota.
  perform 1 from public.organisations where id = tenant for update;
  if not found then
    raise exception 'organisation does not exist' using errcode = '23503';
  end if;

  select s.id, p.limits
    into v_subscription_id, plan_limits
  from public.subscriptions s
  join public.subscription_plans p on p.id = s.plan_id
  join public.organisations o on o.id = s.organisation_id
  where s.organisation_id = tenant
    and s.status in ('trial','active','grace')
    and s.period_end > now()
    and o.approval_status = 'approved'
    and o.lifecycle_status <> 'suspended'
  order by s.created_at desc
  limit 1;

  if v_subscription_id is null then
    raise exception 'an eligible subscription is required to upload files' using errcode = '23514';
  end if;

  -- Storage allowances are configured in MiB. Extra-storage add-ons are sold
  -- in 5-GB units according to subscription_addon_catalogue.unit_quantity.
  base_limit_bytes := greatest(0, coalesce((plan_limits->>'storage_mb')::bigint, 0)) * 1024 * 1024;

  select coalesce(sum(a.quantity * c.unit_quantity), 0) * 1024 * 1024 * 1024
    into addon_limit_bytes
  from public.subscription_addons a
  join public.subscription_addon_catalogue c
    on c.addon_key = a.addon_key and c.active
  where a.subscription_id = v_subscription_id
    and a.addon_key = 'extra_storage';

  -- Security-definer execution can see the full bucket usage, independent of caller RLS.
  select coalesce(sum((o.metadata->>'size')::bigint), 0)
    into current_usage_bytes
  from storage.objects o
  where o.bucket_id = 'novagrid-files'
    and split_part(o.name, '/', 1) = tenant::text
    and o.id is distinct from excluded_object_id;

  if current_usage_bytes + incoming_bytes > base_limit_bytes + addon_limit_bytes then
    raise exception 'organisation storage quota exceeded. Upgrade your plan or add storage.' using errcode = '23514';
  end if;

  return new;
end
$$;

drop trigger if exists novagrid_storage_quota on storage.objects;
create trigger novagrid_storage_quota
before insert or update of bucket_id, name, metadata on storage.objects
for each row execute function private.enforce_tenant_storage_quota();

-- Storage objects remain private and tenant-scoped. The first path segment is
-- always the organisation UUID; browser clients cannot address another tenant.
drop policy if exists novagrid_storage_select on storage.objects;
create policy novagrid_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'novagrid-files'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.is_tenant_member(split_part(name, '/', 1)::uuid)
);

drop policy if exists novagrid_storage_insert on storage.objects;
create policy novagrid_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'novagrid-files'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.is_tenant_member(split_part(name, '/', 1)::uuid)
  and private.is_writable(split_part(name, '/', 1)::uuid)
);

drop policy if exists novagrid_storage_update on storage.objects;
create policy novagrid_storage_update on storage.objects
for update to authenticated
using (
  bucket_id = 'novagrid-files'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.is_tenant_member(split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'novagrid-files'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.is_tenant_member(split_part(name, '/', 1)::uuid)
  and private.is_writable(split_part(name, '/', 1)::uuid)
);

drop policy if exists novagrid_storage_delete on storage.objects;
create policy novagrid_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'novagrid-files'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.is_tenant_member(split_part(name, '/', 1)::uuid)
);

grant usage on schema storage to authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated;
