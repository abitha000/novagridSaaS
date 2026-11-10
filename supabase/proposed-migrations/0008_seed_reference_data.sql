-- 0008_seed_reference_data.sql  (PROPOSED - not applied)
-- Reference data only. Plan prices are SAMPLE values (is_sample = true): replace before commercial launch.
create or replace function public.novagrid_schema_version() returns integer language sql stable set search_path = '' as $$ select 8 $$;

insert into public.industry_categories (key, name) values
  ('gym','Gym & Fitness'),('education','Schools & Colleges'),('hospital','Hospitals & Clinics'),('hotel','Hotels'),
  ('restaurant','Restaurants'),('salon','Salons & Beauty'),('retail','Retail & Stores'),('corporate','Corporate Offices'),
  ('auto','Automotive'),('logistics','Logistics'),('tuition','Tuition & Coaching'),('pro','Professional Services')
on conflict (key) do nothing;

insert into public.permissions (key, module_key, action)
select r || '.' || a, r, a from (values
  ('contacts','view'),('contacts','create'),('contacts','edit'),('contacts','delete'),('contacts','export'),
  ('staff','view'),('staff','manage'),
  ('communications','view'),('communications','send'),
  ('payments','view'),('payments','create'),('payments','edit'),('payments','approve'),('payments','export'),
  ('reports','view'),('reports','export'),
  ('documents','view'),('documents','create'),('documents','delete'),
  ('settings','view'),('settings','manage'),
  ('audit','view'),
  ('automation','view'),('automation','manage'),
  ('subscription','view'),('subscription','manage')) as p(r, a)
on conflict (key) do nothing;

insert into public.roles (tenant_id, key, name, is_system) values
  (null,'owner','Organisation Owner',true),(null,'admin','Organisation Admin',true),(null,'manager','Manager',true),
  (null,'operator','Operator',true),(null,'accountant','Accountant',true),(null,'readonly','Read-only Staff',true)
on conflict do nothing;

-- Role matrix. Idempotent: re-running adds only missing rows.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on (
  (r.key in ('owner','admin'))
  or (r.key = 'manager' and p.key not in ('staff.manage','settings.manage','subscription.manage','audit.view','contacts.delete'))
  or (r.key = 'operator' and p.key in ('contacts.view','contacts.create','contacts.edit','communications.view','communications.send','documents.view','documents.create','payments.view'))
  or (r.key = 'accountant' and (p.module_key in ('payments','reports') or p.key in ('contacts.view','documents.view','subscription.view')))
  or (r.key = 'readonly' and p.action = 'view' and p.key <> 'audit.view'))
where r.tenant_id is null
on conflict do nothing;

insert into public.module_catalogue (key, name, scope, industry_category_id)
select m.key, m.name, 'core', null from (values
  ('core.org','Organisation management'),('core.staff','Staff management'),('core.contacts','Contacts and people'),('core.rbac','Roles and permissions'),
  ('core.notify','Notification centre'),('core.whatsapp','WhatsApp'),('core.sms','SMS'),('core.email','Email'),('core.billing','Payments and billing'),
  ('core.subscription','Subscription management'),('core.workflow','Workflow automation'),('core.schedule','Scheduling'),('core.reports','Reports'),
  ('core.documents','Documents'),('core.audit','Audit logs'),('core.settings','Settings'),('core.branding','Branding'),('core.export','Data export')) as m(key, name)
on conflict (key) do nothing;

insert into public.module_catalogue (key, name, scope, industry_category_id)
select m.key, m.name, 'industry', c.id from (values
  ('gym.members','Members','gym'),('gym.memberships','Membership plans','gym'),('gym.attendance','Attendance','gym'),('gym.trainers','Trainers','gym'),('gym.renewals','Renewals','gym'),
  ('edu.students','Students','education'),('edu.guardians','Guardians','education'),('edu.classes','Classes and sections','education'),('edu.attendance','Attendance','education'),
  ('edu.fees','Fees','education'),('edu.transport','Transport','education'),('edu.timetables','Timetables','education'),('edu.exams','Examinations','education'),
  ('hospital.patients','Patients','hospital'),('hospital.appointments','Appointments','hospital'),
  ('hotel.rooms','Rooms','hotel'),('hotel.reservations','Reservations','hotel')) as m(key, name, cat)
join public.industry_categories c on c.key = m.cat
on conflict (key) do nothing;

insert into public.subscription_plans (key, tier, name, price_inr_monthly, price_inr_yearly, limits, is_sample) values
  ('trial','trial','Free Trial',0,0,'{"staff":3,"contacts":100,"messages_per_month":100,"storage_mb":100}',true),
  ('basic','basic','Basic',1499,14390,'{"staff":10,"contacts":1000,"messages_per_month":1000,"storage_mb":2048}',true),
  ('pro','professional','Professional',4999,47990,'{"staff":50,"contacts":10000,"messages_per_month":10000,"storage_mb":20480}',true),
  ('ent','enterprise','Enterprise',null,null,'{}',true)
on conflict (key) do nothing;

-- Generic plans entitle all modules; has_module_access() still restricts each organisation to core + its OWN industry.
insert into public.plan_entitlements (plan_id, module_id)
select p.id, m.id from public.subscription_plans p cross join public.module_catalogue m
where p.industry_category_id is null
  and (p.key in ('pro','ent') or m.key not in ('core.workflow','core.audit','core.rbac'))
on conflict do nothing;
