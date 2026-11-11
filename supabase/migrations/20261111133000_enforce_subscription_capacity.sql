-- Enforce plan capacity at the database boundary so browser and service-role writes
-- cannot bypass staff/contact limits. Add-ons contribute their configured unit quantities.
create or replace function private.enforce_subscription_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant uuid;
  plan_limits jsonb;
  industry_key text;
  staff_limit bigint;
  people_limit bigint;
  staff_addons bigint := 0;
  people_addons bigint := 0;
  current_count bigint;
  current_status text;
begin
  tenant := new.tenant_id;
  -- Serialize capacity checks per organisation so concurrent inserts cannot exceed limits.
  perform 1 from public.organisations where id = tenant for update;

  select s.status, p.limits, c.key
    into current_status, plan_limits, industry_key
  from public.organisations o
  join public.subscriptions s on s.organisation_id = o.id
    and s.status in ('trial','active','grace')
    and s.period_end > now()
  join public.subscription_plans p on p.id = s.plan_id
  join public.industry_categories c on c.id = o.industry_category_id
  where o.id = tenant and o.approval_status = 'approved'
    and o.lifecycle_status <> 'suspended'
  order by s.created_at desc
  limit 1;

  if plan_limits is null then
    -- Registration creates the first owner membership before a trial is assigned.
    -- Permit only that initial owner row; all subsequent staff/contacts remain blocked.
    if tg_table_name = 'tenant_users' and tg_op = 'INSERT'
       and new.status = 'active'
       and exists (select 1 from public.roles r where r.id = new.role_id and r.key = 'owner' and r.tenant_id is null)
       and not exists (select 1 from public.tenant_users tu where tu.tenant_id = tenant) then
      return new;
    end if;
    raise exception 'an eligible subscription is required before adding records' using errcode = '23514';
  end if;

  staff_limit := coalesce((plan_limits->>'staff')::bigint, 0);
  people_limit := case
    when industry_key = 'gym' then coalesce((plan_limits->>'active_members')::bigint, 0)
    when industry_key = 'education' then coalesce((plan_limits->>'active_students')::bigint, 0)
    else coalesce((plan_limits->>'active_contacts')::bigint, 0)
  end;

  select
    coalesce(sum(case when a.addon_key = 'extra_staff' then a.quantity * c.unit_quantity else 0 end),0),
    coalesce(sum(case when a.addon_key = 'extra_contacts' then a.quantity * c.unit_quantity else 0 end),0)
  into staff_addons, people_addons
  from public.subscriptions s
  join public.subscription_addons a on a.subscription_id = s.id
  join public.subscription_addon_catalogue c on c.addon_key = a.addon_key and c.active
  where s.organisation_id = tenant and s.status in ('trial','active','grace')
    and s.period_end > now();

  if tg_table_name = 'tenant_users' then
    if tg_op = 'INSERT' and new.status = 'active' then
      select count(*) into current_count from public.tenant_users
      where tenant_id = tenant and status = 'active';
      if current_count >= staff_limit + staff_addons then
        raise exception 'staff limit reached for your subscription. Upgrade your plan or add staff capacity.' using errcode = '23514';
      end if;
    elsif tg_op = 'UPDATE' and old.status <> 'active' and new.status = 'active' then
      select count(*) into current_count from public.tenant_users
      where tenant_id = tenant and status = 'active' and id <> old.id;
      if current_count >= staff_limit + staff_addons then
        raise exception 'staff limit reached for your subscription. Upgrade your plan or add staff capacity.' using errcode = '23514';
      end if;
    end if;
  elsif tg_table_name = 'contacts' then
    if new.deleted_at is null and new.status = 'active'
      and (tg_op = 'INSERT' or old.deleted_at is not null or old.status <> 'active') then
      select count(*) into current_count from public.contacts
      where tenant_id = tenant and deleted_at is null and status = 'active'
        and (case when industry_key = 'gym' then type = 'member'
                  when industry_key = 'education' then type = 'student'
                  else true end)
        and (tg_op = 'INSERT' or id <> old.id);
      if current_count >= people_limit + people_addons then
        raise exception 'people limit reached for your subscription. Upgrade your plan or add contact capacity.' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists tenant_users_capacity on public.tenant_users;
create trigger tenant_users_capacity
before insert or update of status on public.tenant_users
for each row execute function private.enforce_subscription_capacity();

drop trigger if exists contacts_capacity on public.contacts;
create trigger contacts_capacity
before insert or update of status, deleted_at, type on public.contacts
for each row execute function private.enforce_subscription_capacity();
