-- Enforce monthly notification recipient quotas at the database boundary.
-- Plans without messages_per_month remain explicitly unmetered until a launch allowance is approved.
create or replace function private.enforce_monthly_message_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan_limits jsonb;
  monthly_limit bigint;
  addon_credits bigint := 0;
  used_count bigint;
  current_subscription uuid;
begin
  -- Only queued recipients consume a message credit; skipped recipients are not billable.
  if new.status <> 'queued' then
    return new;
  end if;

  select s.id, p.limits
    into current_subscription, plan_limits
  from public.subscriptions s
  join public.subscription_plans p on p.id = s.plan_id
  join public.organisations o on o.id = s.organisation_id
  where s.organisation_id = new.tenant_id
    and s.status in ('trial','active','grace')
    and s.period_end > now()
    and o.approval_status = 'approved'
    and o.lifecycle_status <> 'suspended'
  order by s.created_at desc
  limit 1;

  if current_subscription is null then
    raise exception 'an eligible subscription is required to queue notifications' using errcode = '23514';
  end if;

  -- NULL means the commercial allowance has not yet been configured; do not invent a cap.
  if not (plan_limits ? 'messages_per_month') then
    return new;
  end if;

  monthly_limit := greatest(0, coalesce((plan_limits->>'messages_per_month')::bigint, 0));

  select coalesce(sum(a.quantity * c.unit_quantity),0)
    into addon_credits
  from public.subscription_addons a
  join public.subscription_addon_catalogue c on c.addon_key = a.addon_key and c.active
  where a.subscription_id = current_subscription and a.addon_key = 'extra_messages';

  -- Serialize monthly credit checks per organisation to prevent concurrent sends exceeding quota.
  perform 1 from public.organisations where id = new.tenant_id for update;

  select count(*) into used_count
  from public.notification_recipients nr
  where nr.tenant_id = new.tenant_id
    and nr.created_at >= date_trunc('month', now())
    and nr.status <> 'skipped';

  if used_count >= monthly_limit + addon_credits then
    raise exception 'monthly message allowance reached. Upgrade your plan or add message credits.' using errcode = '23514';
  end if;

  return new;
end
$$;

drop trigger if exists notification_recipient_monthly_quota on public.notification_recipients;
create trigger notification_recipient_monthly_quota
before insert on public.notification_recipients
for each row execute function private.enforce_monthly_message_quota();

