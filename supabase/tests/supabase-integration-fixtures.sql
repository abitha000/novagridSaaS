-- Disposable local Supabase integration fixtures only.
-- User IDs are supplied by the workflow after Auth Admin API creates test users.
insert into public.organisations
 (id,name,industry_category_id,owner_name,owner_email,approval_status,lifecycle_status,created_by)
select '21000000-0000-0000-0000-000000000001','Integration Tenant A',c.id,'Test Owner A','owner-a@novagrid.test','approved','active',:'user_a'::uuid
from public.industry_categories c where c.key='gym';
insert into public.organisations
 (id,name,industry_category_id,owner_name,owner_email,approval_status,lifecycle_status,created_by)
select '21000000-0000-0000-0000-000000000002','Integration Tenant B',c.id,'Test Owner B','owner-b@novagrid.test','approved','active',:'user_b'::uuid
from public.industry_categories c where c.key='gym';

insert into public.tenant_users(tenant_id,user_id,role_id,full_name,email,status)
select '21000000-0000-0000-0000-000000000001',:'user_a'::uuid,r.id,'Test Owner A','owner-a@novagrid.test','active'
from public.roles r where r.tenant_id is null and r.key='owner';
insert into public.tenant_users(tenant_id,user_id,role_id,full_name,email,status)
select '21000000-0000-0000-0000-000000000002',:'user_b'::uuid,r.id,'Test Owner B','owner-b@novagrid.test','active'
from public.roles r where r.tenant_id is null and r.key='owner';

insert into public.subscriptions(organisation_id,plan_id,status,period_end)
select '21000000-0000-0000-0000-000000000001',p.id,'active',now()+interval '30 days'
from public.subscription_plans p where p.key='gym_starter';
insert into public.subscriptions(organisation_id,plan_id,status,period_end)
select '21000000-0000-0000-0000-000000000002',p.id,'active',now()+interval '30 days'
from public.subscription_plans p where p.key='gym_starter';

insert into public.contacts(tenant_id,full_name,type)
values
 ('21000000-0000-0000-0000-000000000001','Tenant A Contact','member'),
 ('21000000-0000-0000-0000-000000000002','Tenant B Contact','member');
