-- Increase only the disposable fixture plan so RBAC tests are not testing quota exhaustion.
update public.subscription_plans set limits=jsonb_set(limits,'{staff}','10'::jsonb) where key='gym_starter';

-- Disposable local Supabase staff RBAC fixtures. Never run against hosted production.
insert into public.tenant_users(tenant_id,user_id,role_id,full_name,email,status)
select '21000000-0000-0000-0000-000000000001', :'operator_id'::uuid, r.id,
       'Integration Operator', 'staff-operator@novagrid.test', 'active'
from public.roles r where r.tenant_id is null and r.key='operator';

insert into public.tenant_users(tenant_id,user_id,role_id,full_name,email,status)
select '21000000-0000-0000-0000-000000000001', :'target_id'::uuid, r.id,
       'Integration Target', 'staff-target@novagrid.test', 'invited'
from public.roles r where r.tenant_id is null and r.key='readonly';

insert into public.roles(tenant_id,key,name,is_system)
select '21000000-0000-0000-0000-000000000001','tenant_custom','Tenant Custom',false
where not exists (select 1 from public.roles where tenant_id='21000000-0000-0000-0000-000000000001' and key='tenant_custom');


insert into public.tenant_users(tenant_id,user_id,role_id,full_name,email,status)
select '21000000-0000-0000-0000-000000000001', :'admin_id'::uuid, r.id,
       'Integration Admin', 'staff-admin@novagrid.test', 'active'
from public.roles r where r.tenant_id is null and r.key='admin';

