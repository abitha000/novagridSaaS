create or replace function public.novagrid_schema_version() returns integer language sql stable set search_path = '' as $$ select 11 $$;

-- A short-lived reservation closes the race between checking capacity and calling
-- the external Auth invitation API. Reservations are invisible to browser roles.
create table public.staff_invitation_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organisations(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  role_id uuid not null references public.roles(id),
  full_name text,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  unique (tenant_id,email)
);
alter table public.staff_invitation_reservations enable row level security;
alter table public.staff_invitation_reservations force row level security;
revoke all on public.staff_invitation_reservations from public,anon,authenticated,service_role;

-- Active staff, pending Auth invitations and unexpired reservations all consume seats.
create or replace function private.enforce_staff_invitation_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limits jsonb;
  v_limit bigint;
  v_addons bigint := 0;
  v_count bigint;
begin
  if new.status not in ('active','invited') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('active','invited') then return new; end if;
  perform 1 from public.organisations where id = new.tenant_id for update;

  select p.limits into v_limits
  from public.organisations o
  join public.subscriptions s on s.organisation_id=o.id
    and s.status in ('trial','active','grace') and s.period_end>now()
  join public.subscription_plans p on p.id=s.plan_id
  where o.id=new.tenant_id and o.approval_status='approved' and o.lifecycle_status<>'suspended'
  order by s.created_at desc limit 1;
  if v_limits is null then
    raise exception 'an eligible subscription is required before inviting staff' using errcode='23514';
  end if;
  v_limit:=greatest(0,coalesce((v_limits->>'staff')::bigint,0));
  select coalesce(sum(a.quantity*c.unit_quantity),0) into v_addons
  from public.subscriptions s
  join public.subscription_addons a on a.subscription_id=s.id
  join public.subscription_addon_catalogue c on c.addon_key=a.addon_key and c.active
  where s.organisation_id=new.tenant_id and s.status in ('trial','active','grace')
    and s.period_end>now() and a.addon_key='extra_staff';

  select
    (select count(*) from public.tenant_users tu
      where tu.tenant_id=new.tenant_id and tu.status in ('active','invited')
        and (tg_op='INSERT' or tu.id<>new.id))
    +
    (select count(*) from public.staff_invitation_reservations r
      where r.tenant_id=new.tenant_id and r.expires_at>now())
  into v_count;
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

-- This check is called with the invitee's caller JWT, before service-role use.
create or replace function public.can_manage_staff(p_tenant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and private.has_permission(p_tenant,'staff.manage')
    and private.is_writable(p_tenant)
$$;
revoke all on function public.can_manage_staff(uuid) from public,anon;
grant execute on function public.can_manage_staff(uuid) to authenticated;

-- Reserve one seat atomically before sending an email. The organisation row lock
-- serialises concurrent reservations and direct staff inserts.
create or replace function public.reserve_staff_invitation(
  p_tenant uuid,p_email text,p_role_key text,p_full_name text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid:=auth.uid();
  v_role uuid;
  v_limits jsonb;
  v_limit bigint;
  v_addons bigint:=0;
  v_used bigint;
  v_reservation uuid;
  v_email text:=lower(trim(coalesce(p_email,'')));
begin
  if v_uid is null then raise exception 'not authenticated' using errcode='28000'; end if;
  if not private.has_permission(p_tenant,'staff.manage') or not private.is_writable(p_tenant) then
    raise exception 'not allowed to invite staff' using errcode='42501';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or char_length(v_email)>254 or p_role_key not in ('admin','manager','operator','accountant','readonly')
    or (p_full_name is not null and char_length(trim(p_full_name)) not between 2 and 160) then
    raise exception 'invalid staff invitation details' using errcode='22023';
  end if;
  perform 1 from public.organisations where id=p_tenant for update;
  if not found then raise exception 'organisation not found' using errcode='22023'; end if;
  delete from public.staff_invitation_reservations
    where tenant_id=p_tenant and expires_at<=now();
  if exists(select 1 from public.tenant_users where tenant_id=p_tenant and lower(email)=v_email) then
    raise exception 'staff membership already exists for this email' using errcode='23505';
  end if;
  select id into v_role from public.roles where tenant_id is null and key=p_role_key;
  if v_role is null then raise exception 'staff role unavailable' using errcode='22023'; end if;
  select p.limits into v_limits
  from public.subscriptions s join public.subscription_plans p on p.id=s.plan_id
  where s.organisation_id=p_tenant and s.status in ('trial','active','grace') and s.period_end>now()
  order by s.created_at desc limit 1;
  if v_limits is null then raise exception 'eligible subscription required' using errcode='23514'; end if;
  v_limit:=greatest(0,coalesce((v_limits->>'staff')::bigint,0));
  select coalesce(sum(a.quantity*c.unit_quantity),0) into v_addons
  from public.subscriptions s join public.subscription_addons a on a.subscription_id=s.id
  join public.subscription_addon_catalogue c on c.addon_key=a.addon_key and c.active
  where s.organisation_id=p_tenant and s.status in ('trial','active','grace')
    and s.period_end>now() and a.addon_key='extra_staff';
  select
    (select count(*) from public.tenant_users tu where tu.tenant_id=p_tenant and tu.status in ('active','invited'))
    +
    (select count(*) from public.staff_invitation_reservations r where r.tenant_id=p_tenant and r.expires_at>now())
  into v_used;
  if v_used>=v_limit+v_addons then
    raise exception 'staff seat limit reached' using errcode='23514';
  end if;
  insert into public.staff_invitation_reservations(tenant_id,email,role_id,full_name,invited_by)
  values(p_tenant,v_email,v_role,nullif(trim(p_full_name),''),v_uid)
  returning id into v_reservation;
  return v_reservation;
end;
$$;
revoke all on function public.reserve_staff_invitation(uuid,text,text,text) from public,anon;
grant execute on function public.reserve_staff_invitation(uuid,text,text,text) to authenticated;

-- Completion and release are service-role-only. Completion is one transaction:
-- remove the reservation and create the invited membership while holding the tenant lock.
create or replace function public.complete_staff_invitation(p_reservation uuid,p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.staff_invitation_reservations%rowtype;
begin
  if auth.role()<>'service_role' then raise exception 'service role only' using errcode='42501'; end if;
  select * into v_row from public.staff_invitation_reservations where id=p_reservation for update;
  if not found or v_row.expires_at<=now() then raise exception 'invitation reservation expired' using errcode='22023'; end if;
  perform 1 from public.organisations where id=v_row.tenant_id for update;
  delete from public.staff_invitation_reservations where id=p_reservation;
  insert into public.tenant_users(tenant_id,user_id,role_id,full_name,email,status,invited_by)
  values(v_row.tenant_id,p_user,v_row.role_id,v_row.full_name,v_row.email,'invited',v_row.invited_by);
end;
$$;
revoke all on function public.complete_staff_invitation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.complete_staff_invitation(uuid,uuid) to service_role;

create or replace function public.release_staff_invitation(p_reservation uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role()<>'service_role' then raise exception 'service role only' using errcode='42501'; end if;
  delete from public.staff_invitation_reservations where id=p_reservation;
end;
$$;
revoke all on function public.release_staff_invitation(uuid) from public,anon,authenticated;
grant execute on function public.release_staff_invitation(uuid) to service_role;
