\set ON_ERROR_STOP on
-- Seed two independent organisations and users. Synthetic test identities only.
insert into auth.users (id,email,email_confirmed_at) values
 ('10000000-0000-0000-0000-000000000001','a@example.test',now()),
 ('10000000-0000-0000-0000-000000000002','b@example.test',now());

insert into public.organisations (id,name,industry_category_id,owner_name,owner_email,approval_status,lifecycle_status,created_by)
select '20000000-0000-0000-0000-000000000001','Tenant A',id,'Owner A','a@example.test','approved','active','10000000-0000-0000-0000-000000000001'
from public.industry_categories where key='gym';
insert into public.organisations (id,name,industry_category_id,owner_name,owner_email,approval_status,lifecycle_status,created_by)
select '20000000-0000-0000-0000-000000000002','Tenant B',id,'Owner B','b@example.test','approved','active','10000000-0000-0000-0000-000000000002'
from public.industry_categories where key='education';

insert into public.tenant_users (tenant_id,user_id,role_id,full_name,email)
select o.id,u.id,r.id,'Owner','owner@example.test'
from public.organisations o
join auth.users u on u.id=o.created_by
join public.roles r on r.tenant_id is null and r.key='owner';

insert into public.subscriptions (organisation_id,plan_id,status,period_end)
select o.id,p.id,'active',now()+interval '30 days'
from public.organisations o
join public.industry_categories c on c.id=o.industry_category_id
join public.subscription_plans p on p.key = case c.key
  when 'gym' then 'gym_starter'
  when 'education' then 'education_starter'
end and p.industry_category_id=o.industry_category_id;

insert into public.contacts (tenant_id,full_name,type)
values
 ('20000000-0000-0000-0000-000000000001','Contact A','member'),
 ('20000000-0000-0000-0000-000000000002','Contact B','student');

-- Structural assertions: final schema version, reference seeds, RLS + FORCE RLS.
do $$
declare v int; r record;
begin
  select public.novagrid_schema_version() into v;
  if v <> 10 then raise exception 'schema version expected 10, got %', v; end if;
  if (select count(*) from public.industry_categories) < 10 then raise exception 'industry seeds missing'; end if;
  if (select count(*) from public.roles where tenant_id is null) < 6 then raise exception 'system roles missing'; end if;
  for r in select tablename from pg_tables where schemaname='public' and tablename <> 'kv_store_5a875bd1' loop
    if not (select relrowsecurity and relforcerowsecurity from pg_class where oid = format('public.%I',r.tablename)::regclass) then
      raise exception 'RLS is not enabled and forced on public.%',r.tablename;
    end if;
  end loop;
end $$;

-- User A must see only tenant A's records and must not insert into tenant B.
set role authenticated;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
do $$
declare n int;
begin
  select count(*) into n from public.contacts;
  if n <> 1 then raise exception 'tenant A should see exactly one contact, saw %', n; end if;
  if exists (select 1 from public.contacts where tenant_id='20000000-0000-0000-0000-000000000002') then
    raise exception 'tenant A can read tenant B contacts';
  end if;
  begin
    insert into public.contacts (tenant_id,full_name)
    values ('20000000-0000-0000-0000-000000000002','Cross tenant attack');
    raise exception 'tenant A unexpectedly inserted a tenant B contact';
  exception when insufficient_privilege then
    null; -- expected RLS WITH CHECK rejection
  end;
end $$;
reset role;

-- A tenant owner must not be able to use platform-only approval or subscription RPCs.
set role authenticated;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
do $platform_guard$
begin
  begin
    perform public.decide_organisation_approval(
      '20000000-0000-0000-0000-000000000002', 'reject', null, 'test'
    );
    raise exception 'tenant user unexpectedly called platform approval RPC';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_organisation_suspension(
      '20000000-0000-0000-0000-000000000002', true, 'test'
    );
    raise exception 'tenant user unexpectedly called platform suspension RPC';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.assign_subscription(
      '20000000-0000-0000-0000-000000000002', 'education_starter', 'active', now()+interval '30 days'
    );
    raise exception 'tenant user unexpectedly assigned a subscription';
  exception when insufficient_privilege then null;
  end;
end
$platform_guard$;
reset role;

-- SECURITY DEFINER legacy helper must not be directly executable by API roles.
do $rpc_grants$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null
    and (has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE')
      or has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE')) then
    raise exception 'legacy SECURITY DEFINER helper remains executable by API roles';
  end if;
end
$rpc_grants$;

-- Trigger-level invariants: tenant-owned roles cannot be moved and cannot be assigned across tenants.
insert into public.roles (tenant_id,key,name,is_system)
values ('20000000-0000-0000-0000-000000000001','custom_test','Tenant A custom',false);
do $$
declare v_role uuid;
begin
  select id into v_role from public.roles where tenant_id='20000000-0000-0000-0000-000000000001' and key='custom_test';
  begin
    update public.roles set tenant_id='20000000-0000-0000-0000-000000000002' where id=v_role;
    raise exception 'role tenant reassignment unexpectedly succeeded';
  exception when check_violation then null;
  end;
  begin
    insert into public.tenant_users (tenant_id,user_id,role_id,full_name,email)
    values ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',v_role,'Wrong Role','b@example.test');
    raise exception 'cross-tenant role assignment unexpectedly succeeded';
  exception when check_violation then null;
  end;
end $$;

-- Last active owner cannot be demoted or deleted.
do $$
declare v_owner uuid;
begin
  select id into v_owner from public.tenant_users
    where tenant_id='20000000-0000-0000-0000-000000000001' and user_id='10000000-0000-0000-0000-000000000001';
  begin
    update public.tenant_users set status='disabled' where id=v_owner;
    raise exception 'last owner disable unexpectedly succeeded';
  exception when check_violation then null;
  end;
  begin
    delete from public.tenant_users where id=v_owner;
    raise exception 'last owner delete unexpectedly succeeded';
  exception when check_violation then null;
  end;
end $$;

-- Category-scoped plan assignment and module checks are enforced by the entitlement resolver.
do $$
declare v_edu uuid; v_gym uuid;
begin
  select id into v_edu from public.industry_categories where key='education';
  select id into v_gym from public.industry_categories where key='gym';
  if v_edu = v_gym then raise exception 'industry category IDs unexpectedly collide'; end if;
  if exists (
    select 1 from public.module_catalogue m
    where m.scope='industry' and m.industry_category_id=v_edu and m.key like 'gym.%'
  ) then raise exception 'gym module incorrectly assigned to education'; end if;
end $$;


-- Pricing catalogue must contain three plans per launch industry with correct scope and prices.
do $pricing$
begin
  if (select count(*) from public.subscription_plans where active and industry_category_id is not null and key like 'gym_%') <> 3 then
    raise exception 'expected three active Gym plans';
  end if;
  if (select count(*) from public.subscription_plans where active and industry_category_id is not null and key like 'education_%') <> 3 then
    raise exception 'expected three active Education plans';
  end if;
  if exists (
    select 1 from public.plan_entitlements pe
    join public.subscription_plans p on p.id = pe.plan_id
    join public.module_catalogue m on m.id = pe.module_id
    where (p.industry_category_id is not null and m.scope = 'industry')
      and p.industry_category_id <> m.industry_category_id
  ) then raise exception 'cross-industry plan entitlement found'; end if;
  if not exists (select 1 from public.subscription_plans where key='gym_starter' and price_inr_monthly=799 and limits->>'active_members'='100') then
    raise exception 'Gym Starter pricing or capacity mismatch';
  end if;
  if not exists (select 1 from public.subscription_plans where key='education_growth' and price_inr_monthly=2999 and limits->>'active_students'='750') then
    raise exception 'Education Growth pricing or capacity mismatch';
  end if;
end $pricing$;


-- Capacity enforcement: reduce a test plan to the current fixture usage and prove
-- that the database rejects an additional active person even if the client bypasses UI.
update public.subscription_plans
set limits = jsonb_set(jsonb_set(limits, '{active_members}', '1'::jsonb), '{staff}', '1'::jsonb)
where key='gym_starter';

do $capacity$
begin
  begin
    insert into public.contacts (tenant_id,full_name,type)
    values ('20000000-0000-0000-0000-000000000001','Over limit member','member');
    raise exception 'member capacity limit was bypassed';
  exception when check_violation then null;
  end;
  begin
    insert into public.tenant_users (tenant_id,user_id,role_id,full_name,email)
    select '20000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',r.id,'Over limit staff','staff@example.test'
    from public.roles r where r.tenant_id is null and r.key='operator';
    raise exception 'staff capacity limit was bypassed';
  exception when check_violation then null;
  end;
end
$capacity$;


-- Monthly messaging quota is enforced only when a commercial allowance is configured.
update public.subscription_plans
set limits = jsonb_set(limits, '{messages_per_month}', '1'::jsonb)
where key='gym_starter';

do $message_quota$
declare
  n1 uuid := gen_random_uuid();
  n2 uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid();
  r2 uuid := gen_random_uuid();
  contact_id uuid;
begin
  select id into contact_id from public.contacts
    where tenant_id='20000000-0000-0000-0000-000000000001' limit 1;
  insert into public.notifications
    (id,tenant_id,title,channel,body,audience_definition,status)
  values
    (n1,'20000000-0000-0000-0000-000000000001','Quota test 1','sms','Test body','{"type":"all"}','queued');
  insert into public.notification_recipients
    (id,tenant_id,notification_id,contact_id,channel,idempotency_key,status)
  values
    (r1,'20000000-0000-0000-0000-000000000001',n1,contact_id,'sms','quota-test-1','queued');

  insert into public.notifications
    (id,tenant_id,title,channel,body,audience_definition,status)
  values
    (n2,'20000000-0000-0000-0000-000000000001','Quota test 2','sms','Test body','{"type":"all"}','queued');
  begin
    insert into public.notification_recipients
      (id,tenant_id,notification_id,contact_id,channel,idempotency_key,status)
    values
      (r2,'20000000-0000-0000-0000-000000000001',n2,contact_id,'sms','quota-test-2','queued');
    raise exception 'monthly message quota was bypassed';
  exception when check_violation then null;
  end;
end
$message_quota$;

select 'NOVAGRID migration and security smoke tests passed' as result;
