\set ON_ERROR_STOP on
-- Seed two independent organisations and users. Synthetic test data only.
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
from public.organisations o cross join public.subscription_plans p
where p.key='basic';
insert into public.contacts (tenant_id,full_name)
values
 ('20000000-0000-0000-0000-000000000001','Contact A'),
 ('20000000-0000-0000-0000-000000000002','Contact B');

do $$
declare v int; r record;
begin
  select public.novagrid_schema_version() into v;
  if v <> 8 then raise exception 'schema version expected 8, got %', v; end if;
  if (select count(*) from public.industry_categories) < 10 then raise exception 'industry seeds missing'; end if;
  if (select count(*) from public.roles where tenant_id is null) < 6 then raise exception 'system roles missing'; end if;
  for r in select tablename from pg_tables where schemaname='public' and tablename <> 'kv_store_5a875bd1' loop
    if not (select relrowsecurity and relforcerowsecurity from pg_class where oid = format('public.%I',r.tablename)::regclass) then
      raise exception 'RLS is not enabled and forced on public.%',r.tablename;
    end if;
  end loop;
end $$;

-- Verify tenant A cannot read tenant B contacts under the authenticated role.
set role authenticated;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
do $$
declare n int;
begin
  select count(*) into n from public.contacts;
  if n <> 1 then raise exception 'tenant isolation failed: tenant A saw % contacts, expected 1', n; end if;
end $$;
reset role;
