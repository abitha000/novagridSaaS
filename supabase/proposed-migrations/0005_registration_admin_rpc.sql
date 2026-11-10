-- 0005_registration_admin_rpc.sql  (PROPOSED - not applied)
-- All functions: SECURITY DEFINER, empty search_path, explicit permission checks, EXECUTE revoked from PUBLIC/anon.
create or replace function public.novagrid_schema_version() returns integer language sql stable set search_path = '' as $$ select 5 $$;

create or replace function public.register_organisation(
  p_registration_token uuid, p_name text, p_owner_name text, p_phone text, p_address text,
  p_country text, p_state text, p_city text, p_category_key text, p_org_type text, p_plan_key text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_email text; v_confirmed timestamptz; v_cat uuid; v_org uuid; v_owner_role uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select email, email_confirmed_at into v_email, v_confirmed from auth.users where id = v_uid;
  if v_confirmed is null then raise exception 'email address is not verified' using errcode = '42501'; end if;

  select id into v_org from public.organisations where created_by = v_uid and registration_token = p_registration_token;
  if v_org is not null then return v_org; end if;                     -- idempotent retry

  if char_length(trim(coalesce(p_name, ''))) < 2 or char_length(trim(coalesce(p_owner_name, ''))) < 2 then
    raise exception 'organisation and owner name are required' using errcode = '22023'; end if;
  if (select count(*) from public.organisations where created_by = v_uid and approval_status = 'pending') >= 3 then
    raise exception 'too many pending registrations' using errcode = '54000'; end if;

  select id into v_cat from public.industry_categories where key = p_category_key and active;
  if v_cat is null then raise exception 'unknown industry category' using errcode = '22023'; end if;
  select id into v_owner_role from public.roles where tenant_id is null and key = 'owner';
  if v_owner_role is null then raise exception 'system roles are not seeded' using errcode = '22023'; end if;

  insert into public.organisations (name, industry_category_id, org_type, owner_name, owner_email, owner_phone, address, country, state, city,
      preferred_plan_key, email_verified_at, created_by, registration_token)
  values (trim(p_name), v_cat, p_org_type, trim(p_owner_name), v_email, nullif(p_phone, ''), p_address, p_country, p_state, p_city,
      p_plan_key, v_confirmed, v_uid, p_registration_token)
  returning id into v_org;

  insert into public.tenant_users (tenant_id, user_id, role_id, full_name, email, status) values (v_org, v_uid, v_owner_role, trim(p_owner_name), v_email, 'active');
  insert into public.organisation_settings (organisation_id) values (v_org);
  insert into public.organisation_approvals (organisation_id, requested_category_id) values (v_org, v_cat);
  return v_org;
end $$;

create or replace function public.decide_organisation_approval(p_org uuid, p_decision text, p_category_key text default null, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_cat uuid;
begin
  if not private.is_platform_admin() then raise exception 'platform administrators only' using errcode = '42501'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid decision' using errcode = '22023'; end if;
  if p_decision = 'rejected' and coalesce(trim(p_reason), '') = '' then raise exception 'a reason is required to reject' using errcode = '22023'; end if;
  if p_category_key is not null then
    select id into v_cat from public.industry_categories where key = p_category_key and active;
    if v_cat is null then raise exception 'unknown industry category' using errcode = '22023'; end if;
  end if;
  update public.organisations set
      approval_status = p_decision,
      lifecycle_status = case when p_decision = 'approved' then 'approved' else 'rejected' end,   -- approval is NOT subscription activation
      industry_category_id = coalesce(v_cat, industry_category_id)
    where id = p_org;
  if not found then raise exception 'organisation not found' using errcode = '22023'; end if;
  update public.organisation_approvals set decision = p_decision, decided_by = auth.uid(), reason = p_reason, decided_at = now(), assigned_category_id = v_cat
    where id = (select id from public.organisation_approvals where organisation_id = p_org and decision = 'pending' order by created_at desc limit 1);
end $$;

create or replace function public.set_organisation_suspension(p_org uuid, p_suspend boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'platform administrators only' using errcode = '42501'; end if;
  update public.organisations set
      lifecycle_status = case when p_suspend then 'suspended'
        when exists (select 1 from public.subscriptions s where s.organisation_id = p_org and s.status in ('trial','active','grace')) then 'active'
        else 'approved' end,
      suspended_at = case when p_suspend then now() else null end
    where id = p_org and approval_status = 'approved';
  if not found then raise exception 'organisation not found or not approved' using errcode = '22023'; end if;
end $$;

-- Subscription activation: separate from approval; payment-gateway driven in production (Phase 7).
create or replace function public.assign_subscription(p_org uuid, p_plan_key text, p_status text, p_period_end timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_plan uuid; v_id uuid;
begin
  if not private.is_platform_admin() then raise exception 'platform administrators only' using errcode = '42501'; end if;
  if p_status not in ('trial','active') then raise exception 'invalid status' using errcode = '22023'; end if;
  if not exists (select 1 from public.organisations where id = p_org and approval_status = 'approved') then
    raise exception 'category must be approved before a subscription can start' using errcode = '23514'; end if;
  select id into v_plan from public.subscription_plans where key = p_plan_key and active;
  if v_plan is null then raise exception 'unknown plan' using errcode = '22023'; end if;
  update public.subscriptions set status = 'cancelled' where organisation_id = p_org and status in ('trial','active','grace','read_only');
  insert into public.subscriptions (organisation_id, plan_id, status, period_end) values (p_org, v_plan, p_status, p_period_end) returning id into v_id;
  update public.organisations set lifecycle_status = 'active' where id = p_org and lifecycle_status <> 'suspended';
  return v_id;
end $$;

create or replace function public.record_consent(p_tenant uuid, p_contact uuid, p_channel text, p_status text, p_source text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (private.has_permission(p_tenant, 'contacts.edit') and private.is_writable(p_tenant)) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_channel not in ('whatsapp','sms','email') or p_status not in ('opted_in','opted_out') or coalesce(trim(p_source), '') = '' then
    raise exception 'invalid consent record' using errcode = '22023'; end if;
  if not exists (select 1 from public.contacts where id = p_contact and tenant_id = p_tenant and deleted_at is null) then
    raise exception 'contact not found' using errcode = '22023'; end if;
  insert into public.communication_preferences (tenant_id, contact_id, channel, consent_status, consent_source, consented_at, revoked_at)
  values (p_tenant, p_contact, p_channel, p_status, p_source, case when p_status = 'opted_in' then now() end, case when p_status = 'opted_out' then now() end)
  on conflict (tenant_id, contact_id, channel) do update set consent_status = excluded.consent_status, consent_source = excluded.consent_source,
    consented_at = excluded.consented_at, revoked_at = excluded.revoked_at, updated_at = now();
  insert into public.consent_events (tenant_id, contact_id, channel, consent_status, source) values (p_tenant, p_contact, p_channel, p_status, p_source);
end $$;

-- Used by the invite-staff Edge Function (called with the CALLER's JWT, so auth.uid() is the inviter).
create or replace function public.can_manage_staff(p_tenant uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_permission(p_tenant, 'staff.manage') and private.is_writable(p_tenant)
$$;

do $$
declare f text;
begin
  foreach f in array array['register_organisation(uuid,text,text,text,text,text,text,text,text,text,text)',
    'decide_organisation_approval(uuid,text,text,text)','set_organisation_suspension(uuid,boolean,text)','assign_subscription(uuid,text,text,timestamptz)',
    'record_consent(uuid,uuid,text,text,text)','can_manage_staff(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
