-- NOVAGRID row-level security and access policies.
-- Helper functions are SECURITY DEFINER with an empty search_path and live in the non-exposed `private` schema.
create or replace function public.novagrid_schema_version() returns integer language sql stable set search_path = '' as $$ select 4 $$;

create or replace function private.is_platform_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_users where user_id = auth.uid() and status = 'active' and role = 'super_admin')
$$;
create or replace function private.is_platform_user() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_users where user_id = auth.uid() and status = 'active')
$$;
create or replace function private.is_tenant_member(t uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tenant_users where tenant_id = t and user_id = auth.uid() and status = 'active')
$$;
create or replace function private.has_permission(t uuid, perm text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_users tu
    join public.role_permissions rp on rp.role_id = tu.role_id
    join public.permissions p on p.id = rp.permission_id
    where tu.tenant_id = t and tu.user_id = auth.uid() and tu.status = 'active' and p.key = perm)
$$;
-- Writes are allowed only when the organisation is approved, not suspended and has a trial/active/grace subscription.
create or replace function private.is_writable(t uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organisations o join public.subscriptions s on s.organisation_id = o.id
    where o.id = t and o.approval_status = 'approved' and o.lifecycle_status <> 'suspended'
      and s.status in ('trial','active','grace'))
$$;
-- Module access = approved org + module is core or belongs to the org's own industry + plan entitles it
-- + subscription is not suspended/expired. A plan upgrade can never unlock another industry's module.
create or replace function private.has_module_access(t uuid, module_key text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.organisations o
    join public.subscriptions s on s.organisation_id = o.id and s.status in ('trial','active','grace','read_only')
    join public.module_catalogue m on m.key = module_key
    join public.plan_entitlements pe on pe.plan_id = s.plan_id and pe.module_id = m.id
    where o.id = t and o.approval_status = 'approved' and o.lifecycle_status <> 'suspended'
      and (m.scope = 'core' or m.industry_category_id = o.industry_category_id))
$$;
grant execute on all functions in schema private to authenticated, service_role;

-- Only an organisation owner may grant or remove the owner role (stops admins promoting themselves).
create or replace function private.guard_owner_role_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_role uuid;
begin
  select id into owner_role from public.roles where tenant_id is null and key = 'owner';
  if new.role_id is distinct from old.role_id and (new.role_id = owner_role or old.role_id = owner_role) then
    if not exists (select 1 from public.tenant_users where tenant_id = old.tenant_id and user_id = auth.uid() and role_id = owner_role and status = 'active') then
      raise exception 'only an owner can change owner assignments' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger tenant_users_owner_guard before update on public.tenant_users for each row execute function private.guard_owner_role_change();

-- Block category / approval changes by anyone but a platform admin (defence in depth with column grants).
create or replace function private.guard_org_protected_columns() returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.industry_category_id is distinct from old.industry_category_id
      or new.approval_status is distinct from old.approval_status
      or new.lifecycle_status is distinct from old.lifecycle_status
      or new.suspended_at is distinct from old.suspended_at)
     and not private.is_platform_admin() then
    raise exception 'only platform administrators can change category, approval or lifecycle' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger organisations_guard before update on public.organisations for each row execute function private.guard_org_protected_columns();

-- ===== Enable + FORCE RLS on every table, then revoke default grants and grant least privilege =====
do $$
declare t text;
begin
  foreach t in array array['industry_categories','platform_users','organisations','organisation_approvals','subscription_plans','subscriptions',
    'subscription_addons','module_catalogue','plan_entitlements','organisation_settings','audit_logs','roles','permissions','role_permissions',
    'tenant_users','contacts','communication_preferences','consent_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Reference data (read-only for the browser)
grant select on public.industry_categories to anon, authenticated;
grant select on public.subscription_plans, public.module_catalogue, public.plan_entitlements, public.permissions, public.role_permissions to authenticated;
create policy categories_read on public.industry_categories for select using (active);   -- anon-safe: calls no private function
create policy categories_read_platform on public.industry_categories for select to authenticated using (private.is_platform_user());
create policy categories_admin on public.industry_categories for all to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());
grant insert, update, delete on public.industry_categories to authenticated;
create policy plans_read on public.subscription_plans for select to authenticated using (active or private.is_platform_user());
create policy modules_read on public.module_catalogue for select to authenticated using (true);
create policy entitlements_read on public.plan_entitlements for select to authenticated using (true);
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions for select to authenticated
  using (exists (
    select 1 from public.roles r
    where r.id = role_permissions.role_id
      and (r.tenant_id is null or private.is_tenant_member(r.tenant_id))
  ));
-- Plan/module/entitlement edits go through the service role or a future admin RPC.

-- Platform users
grant select on public.platform_users to authenticated;
create policy platform_users_self on public.platform_users for select to authenticated using (user_id = auth.uid() or private.is_platform_admin());

-- Organisations: members read their own; platform users read all; members edit only non-protected columns.
grant select on public.organisations to authenticated;
grant update (name, org_type, owner_phone, address, country, state, city) on public.organisations to authenticated;
create policy orgs_read on public.organisations for select to authenticated using (private.is_tenant_member(id) or private.is_platform_user());
create policy orgs_update_own on public.organisations for update to authenticated
  using (private.has_permission(id, 'settings.manage')) with check (private.has_permission(id, 'settings.manage'));

grant select on public.organisation_approvals to authenticated;
create policy approvals_read on public.organisation_approvals for select to authenticated using (private.is_platform_user() or private.is_tenant_member(organisation_id));

grant select on public.subscriptions, public.subscription_addons to authenticated;
create policy subs_read on public.subscriptions for select to authenticated using (private.is_tenant_member(organisation_id) or private.is_platform_user());
create policy addons_read on public.subscription_addons for select to authenticated
  using (exists (select 1 from public.subscriptions s where s.id = subscription_id and (private.is_tenant_member(s.organisation_id) or private.is_platform_user())));

grant select, update on public.organisation_settings to authenticated;
create policy settings_read on public.organisation_settings for select to authenticated using (private.is_tenant_member(organisation_id) or private.is_platform_user());
create policy settings_update on public.organisation_settings for update to authenticated
  using (private.has_permission(organisation_id, 'settings.manage') and private.is_writable(organisation_id))
  with check (private.has_permission(organisation_id, 'settings.manage') and private.is_writable(organisation_id));

grant select on public.audit_logs to authenticated;
create policy audit_read on public.audit_logs for select to authenticated
  using (private.is_platform_admin() or (tenant_id is not null and private.has_permission(tenant_id, 'audit.view')));
-- no insert/update/delete policy and no grant: audit rows are written only by SECURITY DEFINER code

-- Roles
grant select on public.roles to authenticated;
create policy roles_read on public.roles for select to authenticated using (tenant_id is null or private.is_tenant_member(tenant_id));

-- Staff
grant select, update (role_id, status, full_name) on public.tenant_users to authenticated;
create policy staff_read on public.tenant_users for select to authenticated using (private.is_tenant_member(tenant_id) or user_id = auth.uid());
create policy staff_update on public.tenant_users for update to authenticated
  using (private.has_permission(tenant_id, 'staff.manage') and private.is_writable(tenant_id))
  with check (private.has_permission(tenant_id, 'staff.manage') and private.is_writable(tenant_id));
-- inserts happen in the invite-staff Edge Function (service role) after its own permission check; no delete (disable instead)

-- Contacts
grant select, insert, update on public.contacts to authenticated;
create policy contacts_select on public.contacts for select to authenticated
  using (private.has_permission(tenant_id, 'contacts.view') and private.has_module_access(tenant_id, 'core.contacts'));
create policy contacts_insert on public.contacts for insert to authenticated
  with check (private.has_permission(tenant_id, 'contacts.create') and private.has_module_access(tenant_id, 'core.contacts') and private.is_writable(tenant_id));
create policy contacts_update on public.contacts for update to authenticated
  using (private.has_permission(tenant_id, 'contacts.edit') and private.has_module_access(tenant_id, 'core.contacts') and private.is_writable(tenant_id))
  with check (private.has_permission(tenant_id, 'contacts.edit') and private.has_module_access(tenant_id, 'core.contacts') and private.is_writable(tenant_id));
-- hard delete is not granted: contacts are soft-deleted via deleted_at

grant select on public.communication_preferences, public.consent_events to authenticated;
create policy prefs_select on public.communication_preferences for select to authenticated using (private.has_permission(tenant_id, 'contacts.view'));
create policy consent_select on public.consent_events for select to authenticated using (private.has_permission(tenant_id, 'contacts.view'));
-- consent writes only via record_consent()
