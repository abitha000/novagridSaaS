-- PR #21 additive security remediation. No historical migration is rewritten.
create or replace function private.has_eligible_subscription(p_tenant uuid, p_for_write boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    join public.organisations o on o.id=s.organisation_id
    where s.organisation_id=p_tenant and o.approval_status='approved' and o.lifecycle_status <> 'suspended'
      and ((s.status in ('trial','active') and s.period_end>now())
        or (s.status='grace' and s.grace_until is not null and s.grace_until>now())
        or (not p_for_write and s.status='read_only'))
  );
$$;

create or replace function private.is_writable(t uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_eligible_subscription(t,true);
$$;

create or replace function private.has_module_access(t uuid, module_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organisations o
    join public.subscriptions s on s.organisation_id=o.id
    join public.module_catalogue m on m.key=module_key
    join public.plan_entitlements pe on pe.plan_id=s.plan_id and pe.module_id=m.id
    where o.id=t and (m.scope='core' or m.industry_category_id=o.industry_category_id)
  ) and private.has_eligible_subscription(t,false);
$$;

-- Remove blanket EXECUTE grants. Only policy helpers are callable by authenticated users.
revoke execute on all functions in schema private from public, anon, authenticated, service_role;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_platform_user() to authenticated;
grant execute on function private.is_tenant_member(uuid) to authenticated;
grant execute on function private.has_permission(uuid,text) to authenticated;
grant execute on function private.is_writable(uuid) to authenticated;
grant execute on function private.has_module_access(uuid,text) to authenticated;
grant execute on function private.has_eligible_subscription(uuid,boolean) to authenticated;

-- Optional preferred plan must be active and generic or scoped to the chosen category.
create or replace function public.register_organisation(
 p_registration_token uuid,p_name text,p_owner_name text,p_phone text,p_address text,p_country text,p_state text,p_city text,
 p_category_key text,p_org_type text,p_plan_key text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_email text; v_confirmed timestamptz; v_cat uuid; v_org uuid; v_owner_role uuid;
begin
 if v_uid is null then raise exception 'not authenticated' using errcode='28000'; end if;
 select email,email_confirmed_at into v_email,v_confirmed from auth.users where id=v_uid;
 if v_confirmed is null then raise exception 'email address is not verified' using errcode='42501'; end if;
 select id into v_org from public.organisations where created_by=v_uid and registration_token=p_registration_token;
 if v_org is not null then return v_org; end if;
 if char_length(trim(coalesce(p_name,'')))<2 or char_length(trim(coalesce(p_owner_name,'')))<2 then
   raise exception 'organisation and owner name are required' using errcode='22023'; end if;
 if (select count(*) from public.organisations where created_by=v_uid and approval_status='pending')>=3 then
   raise exception 'too many pending registrations' using errcode='54000'; end if;
 select id into v_cat from public.industry_categories where key=p_category_key and active;
 if v_cat is null then raise exception 'unknown industry category' using errcode='22023'; end if;
 if p_plan_key is not null and not exists (
   select 1 from public.subscription_plans p where p.key=p_plan_key and p.active
     and (p.industry_category_id is null or p.industry_category_id=v_cat)) then
   raise exception 'selected plan is unavailable for this industry' using errcode='22023'; end if;
 select id into v_owner_role from public.roles where tenant_id is null and key='owner';
 if v_owner_role is null then raise exception 'system roles are not seeded' using errcode='22023'; end if;
 insert into public.organisations(name,industry_category_id,org_type,owner_name,owner_email,owner_phone,address,country,state,city,
   preferred_plan_key,email_verified_at,created_by,registration_token)
 values(trim(p_name),v_cat,p_org_type,trim(p_owner_name),v_email,nullif(p_phone,''),p_address,p_country,p_state,p_city,
   p_plan_key,v_confirmed,v_uid,p_registration_token) returning id into v_org;
 insert into public.tenant_users(tenant_id,user_id,role_id,full_name,email,status)
 values(v_org,v_uid,v_owner_role,trim(p_owner_name),v_email,'active');
 insert into public.organisation_settings(organisation_id) values(v_org);
 insert into public.organisation_approvals(organisation_id,requested_category_id) values(v_org,v_cat);
 return v_org;
end;
$$;

-- Check general notification plus selected and fallback channel entitlements.
create or replace function public.create_notification(
 p_tenant uuid,p_title text,p_channel text,p_fallback_channel text,p_template_id uuid,p_body text,p_audience jsonb,
 p_scheduled_at timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_queued int; v_channel_module text;
begin
 if not private.has_permission(p_tenant,'communications.send') then raise exception 'not allowed' using errcode='42501'; end if;
 if not private.is_writable(p_tenant) then raise exception 'organisation is read-only or not active' using errcode='42501'; end if;
 if p_channel is null or p_channel not in ('whatsapp','sms','email')
   or (p_fallback_channel is not null and p_fallback_channel not in ('whatsapp','sms','email'))
   or p_fallback_channel=p_channel or coalesce(trim(p_body),'')='' or char_length(p_body)>4096
   or jsonb_typeof(p_audience)<>'object' then
   raise exception 'invalid notification payload' using errcode='22023'; end if;
 v_channel_module:=case p_channel when 'whatsapp' then 'core.whatsapp' when 'sms' then 'core.sms' when 'email' then 'core.email' end;
 if not private.has_module_access(p_tenant,'core.notify') or not private.has_module_access(p_tenant,v_channel_module) then
   raise exception 'notification channel is not enabled for this organisation plan' using errcode='42501'; end if;
 if p_fallback_channel is not null then
   v_channel_module:=case p_fallback_channel when 'whatsapp' then 'core.whatsapp' when 'sms' then 'core.sms' when 'email' then 'core.email' end;
   if not private.has_module_access(p_tenant,v_channel_module) then
     raise exception 'fallback notification channel is not enabled for this organisation plan' using errcode='42501'; end if;
 end if;
 if p_template_id is not null and not exists (
   select 1 from public.notification_templates t where t.id=p_template_id and t.tenant_id=p_tenant
     and t.channel=p_channel and t.provider_status='approved') then
   raise exception 'template must belong to this organisation, match the channel and be approved' using errcode='22023'; end if;
 insert into public.notifications(tenant_id,title,channel,fallback_channel,template_id,body,audience_definition,scheduled_at,status)
 values(p_tenant,left(coalesce(nullif(trim(p_title),''),'Untitled'),160),p_channel,p_fallback_channel,p_template_id,p_body,p_audience,
   p_scheduled_at,case when p_scheduled_at is null or p_scheduled_at<=now() then 'queued' else 'scheduled' end)
 returning id into v_id;
 insert into public.notification_recipients(tenant_id,notification_id,contact_id,channel,idempotency_key,status,skip_reason)
 select p_tenant,v_id,c.id,p_channel,md5(v_id::text||c.id::text||p_channel),
   case when cp.consent_status='opted_in' and ((p_channel='email' and ct.email is not null) or (p_channel<>'email' and ct.phone_e164 is not null))
     then 'queued' else 'skipped' end,
   case when cp.consent_status='opted_out' then 'opted_out'
     when cp.consent_status is distinct from 'opted_in' then 'no_consent'
     when (p_channel='email' and ct.email is null) or (p_channel<>'email' and ct.phone_e164 is null) then 'no_address' end
 from private.resolve_audience(p_tenant,p_audience) as c(id)
 join public.contacts ct on ct.id=c.id and ct.tenant_id=p_tenant
 left join public.communication_preferences cp on cp.tenant_id=p_tenant and cp.contact_id=c.id and cp.channel=p_channel;
 update public.notification_recipients set next_attempt_at=greatest(now(),coalesce(p_scheduled_at,now()))
   where notification_id=v_id and status='queued';
 select count(*) into v_queued from public.notification_recipients where notification_id=v_id and status='queued';
 update public.notifications set recipient_count=v_queued where id=v_id;
 return v_id;
end;
$$;
revoke all on function public.create_notification(uuid,text,text,text,uuid,text,jsonb,timestamptz) from public,anon;
grant execute on function public.create_notification(uuid,text,text,text,uuid,text,jsonb,timestamptz) to authenticated;

-- Durable monthly admission ledger: each recipient consumes at most one credit.
create table if not exists public.notification_usage(
 recipient_id uuid primary key,
 tenant_id uuid not null references public.organisations(id) on delete cascade,
 month_start date not null,
 admitted_at timestamptz not null default now(),
 foreign key(tenant_id,recipient_id) references public.notification_recipients(tenant_id,id) on delete cascade
);
create index if not exists notification_usage_tenant_month on public.notification_usage(tenant_id,month_start);
alter table public.notification_usage enable row level security;
alter table public.notification_usage force row level security;
revoke all on public.notification_usage from public,anon,authenticated,service_role;

create or replace function private.check_notification_usage_quota()
returns trigger language plpgsql security definer set search_path = '' as $$
declare plan_limits jsonb; monthly_limit bigint; addon_credits bigint:=0; used_count bigint; current_subscription uuid;
begin
 if new.status='skipped' then return new; end if;
 if tg_op='UPDATE' and old.status<>'skipped' then return new; end if;
 if exists(select 1 from public.notification_usage u where u.recipient_id=new.id) then return new; end if;
 perform 1 from public.organisations where id=new.tenant_id for update;
 select s.id,p.limits into current_subscription,plan_limits
 from public.subscriptions s join public.subscription_plans p on p.id=s.plan_id
 join public.organisations o on o.id=s.organisation_id
 where s.organisation_id=new.tenant_id and o.approval_status='approved' and o.lifecycle_status<>'suspended'
   and ((s.status in ('trial','active') and s.period_end>now()) or (s.status='grace' and s.grace_until>now()))
 limit 1;
 if current_subscription is null then raise exception 'an eligible subscription is required to queue notifications' using errcode='23514'; end if;
 if not (plan_limits ? 'messages_per_month') then return new; end if;
 monthly_limit:=greatest(0,coalesce((plan_limits->>'messages_per_month')::bigint,0));
 select coalesce(sum(a.quantity*c.unit_quantity),0) into addon_credits
 from public.subscription_addons a join public.subscription_addon_catalogue c on c.addon_key=a.addon_key and c.active
 where a.subscription_id=current_subscription and a.addon_key='extra_messages';
 select count(*) into used_count from public.notification_usage u
 where u.tenant_id=new.tenant_id and u.month_start=date_trunc('month',now())::date;
 if used_count>=monthly_limit+addon_credits then
   raise exception 'monthly message allowance reached. Upgrade your plan or add message credits.' using errcode='23514'; end if;
 return new;
end;
$$;

create or replace function private.record_notification_usage()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.status<>'skipped' then
   insert into public.notification_usage(recipient_id,tenant_id,month_start)
   values(new.id,new.tenant_id,date_trunc('month',now())::date) on conflict(recipient_id) do nothing;
 end if;
 return new;
end;
$$;

drop trigger if exists notification_recipient_monthly_quota on public.notification_recipients;
create trigger notification_recipient_monthly_quota before insert or update of status
 on public.notification_recipients for each row execute function private.check_notification_usage_quota();
drop trigger if exists notification_recipient_usage_ledger on public.notification_recipients;
create trigger notification_recipient_usage_ledger after insert or update of status
 on public.notification_recipients for each row execute function private.record_notification_usage();
revoke all on function private.check_notification_usage_quota() from public,anon,authenticated,service_role;
revoke all on function private.record_notification_usage() from public,anon,authenticated,service_role;
revoke all on function private.has_eligible_subscription(uuid,boolean) from public,anon;
