-- Supabase Storage creates a metadata placeholder before the object backend
-- finishes uploading. The final object size is available on the metadata UPDATE.
-- Validate tenant/subscription at INSERT; enforce byte quota on the final UPDATE.
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
  if new.bucket_id <> 'novagrid-files' then return new; end if;

  if split_part(new.name, '/', 1) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'file path must begin with an organisation UUID' using errcode = '22023';
  end if;
  tenant := split_part(new.name, '/', 1)::uuid;

  -- Serialize all writes and require a real, eligible tenant even for the
  -- pre-upload placeholder row.
  perform 1 from public.organisations where id=tenant for update;
  if not found then raise exception 'organisation does not exist' using errcode='23503'; end if;

  select s.id,p.limits into v_subscription_id,plan_limits
  from public.subscriptions s
  join public.subscription_plans p on p.id=s.plan_id
  join public.organisations o on o.id=s.organisation_id
  where s.organisation_id=tenant
    and o.approval_status='approved' and o.lifecycle_status<>'suspended'
    and ((s.status in ('trial','active') and s.period_end>now())
      or (s.status='grace' and s.grace_until>now()))
  order by s.created_at desc limit 1;

  if v_subscription_id is null then
    raise exception 'an eligible subscription is required to upload files' using errcode='23514';
  end if;

  -- Supabase Storage initially inserts a placeholder with empty metadata.
  -- The completed upload updates metadata with the measured object size.
  if coalesce(new.metadata->>'size','') !~ '^[0-9]+$' then
    if tg_op='INSERT' then return new; end if;
    raise exception 'completed upload is missing file size metadata; refusing quota bypass' using errcode='22023';
  end if;

  incoming_bytes := (new.metadata->>'size')::bigint;
  if tg_op='UPDATE' then excluded_object_id:=old.id; end if;

  base_limit_bytes:=greatest(0,coalesce((plan_limits->>'storage_mb')::bigint,0))*1024*1024;
  select coalesce(sum(a.quantity*c.unit_quantity),0)*1024*1024*1024 into addon_limit_bytes
  from public.subscription_addons a
  join public.subscription_addon_catalogue c on c.addon_key=a.addon_key and c.active
  where a.subscription_id=v_subscription_id and a.addon_key='extra_storage';

  select coalesce(sum((o.metadata->>'size')::bigint),0) into current_usage_bytes
  from storage.objects o
  where o.bucket_id='novagrid-files'
    and split_part(o.name,'/',1)=tenant::text
    and o.id is distinct from excluded_object_id
    and coalesce(o.metadata->>'size','') ~ '^[0-9]+$';

  if current_usage_bytes+incoming_bytes>base_limit_bytes+addon_limit_bytes then
    raise exception 'organisation storage quota exceeded. Upgrade your plan or add storage.' using errcode='23514';
  end if;
  return new;
end
$$;
