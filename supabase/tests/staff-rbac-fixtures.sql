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
values ('21000000-0000-0000-0000-000000000001','tenant_custom','Tenant Custom',false)
on conflict (tenant_id,key) do nothing;

do $$
declare v_role uuid;
begin
  select id into v_role from public.roles
  where tenant_id='21000000-0000-0000-0000-000000000001' and key='tenant_custom';
  begin
    insert into public.tenant_users(tenant_id,user_id,role_id,full_name,email,status)
    values ('21000000-0000-0000-0000-000000000002', :'target_id'::uuid, v_role,
            'Cross Tenant','cross-tenant@novagrid.test','invited');
    raise exception 'cross-tenant role assignment unexpectedly succeeded';
  exception when check_violation then
    null;
  end;
end $$;
