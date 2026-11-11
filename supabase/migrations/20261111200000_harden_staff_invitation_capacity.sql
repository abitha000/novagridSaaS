create or replace function public.novagrid_schema_version() returns integer language sql stable set search_path = '' as $$ select 11 $$;

-- Staff invitations must reserve seats before the invitee accepts.
-- Keep active and pending invitations within the same subscription capacity.
create or replace function private.enforce_staff_invitation_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limits jsonb;
  v_limit bigint;
  v_addons bigint := 0;
  v_count bigint;
begin
  if new.status not in ('active','invited') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('active','invited') then return new; end if;

  -- Serialise competing invitations/activations for this organisation.
  perform 1 from public.organisations where id = new.tenant_id for update;

  select p.limits into v_limits
  from public.organisations o
  join public.subscriptions s on s.organisation_id=o.id
    and s.status in ('trial','active','grace') and s.period_end>now()
  join public.subscription_plans p on p.id=s.plan_id
  where o.id=new.tenant_id and o.approval_status='approved'
    and o.lifecycle_status<>'suspended'
  order by s.created_at desc limit 1;

  if v_limits is null then
    raise exception 'an eligible subscription is required before inviting staff' using errcode='23514';
  end if;

  v_limit:=greatest(0,coalesce((v_limits->>'staff')::bigint,0));
  select coalesce(sum(a.quantity*c.unit_quantity),0) into v_addons
  from public.subscriptions s
  join public.subscription_addons a on a.subscription_id=s.id
  join public.subscription_addon_catalogue c on c.addon_key=a.addon_key and c.active
  where s.organisation_id=new.tenant_id
    and s.status in ('trial','active','grace') and s.period_end>now()
    and a.addon_key='extra_staff';

  select count(*) into v_count from public.tenant_users tu
  where tu.tenant_id=new.tenant_id and tu.status in ('active','invited')
    and (tg_op='INSERT' or tu.id<>new.id);

  if v_count>=v_limit+v_addons then
    raise exception 'staff seat limit reached, including pending invitations' using errcode='23514';
  end if;
  return new;
end;
$$;

drop trigger if exists tenant_users_invitation_capacity on public.tenant_users;
create trigger tenant_users_invitation_capacity
before insert or update of status on public.tenant_users
for each row execute function private.enforce_staff_invitation_capacity();
revoke all on function private.enforce_staff_invitation_capacity() from public,anon,authenticated,service_role;

-- The Edge Function calls this through the caller's JWT before using service-role
-- credentials. The function intentionally returns only a boolean.
create or replace function public.can_manage_staff(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and private.has_permission(p_tenant,'staff.manage')
    and private.is_writable(p_tenant)
$$;
revoke all on function public.can_manage_staff(uuid) from public,anon;
grant execute on function public.can_manage_staff(uuid) to authenticated;
