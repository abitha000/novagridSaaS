-- 0006_notifications.sql  (PROPOSED - not applied)
-- Persistence and queueing only. No provider is called from SQL. Delivery statuses are written by the dispatch
-- worker and signature-verified provider webhooks (Edge Functions, service role), never by the browser.
create or replace function public.novagrid_schema_version() returns integer language sql stable set search_path = '' as $$ select 6 $$;

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organisations(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','sms','email')),
  name text not null check (char_length(name) between 2 and 120),
  body text not null check (char_length(body) between 5 and 4096),
  variables text[] not null default '{}',
  provider_template_id text,
  dlt_template_id text,                                   -- India SMS DLT registration
  provider_status text not null default 'draft' check (provider_status in ('draft','pending','approved','rejected')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);
create trigger templates_updated before update on public.notification_templates for each row execute function private.set_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organisations(id) on delete cascade,
  created_by uuid default auth.uid(),
  title text not null,
  channel text not null check (channel in ('whatsapp','sms','email')),
  fallback_channel text check (fallback_channel in ('whatsapp','sms','email')),
  template_id uuid,
  body text not null,
  audience_definition jsonb not null,
  scheduled_at timestamptz,
  status text not null default 'draft' check (status in ('draft','scheduled','queued','sending','completed','cancelled','failed')),
  recipient_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, template_id) references public.notification_templates (tenant_id, id)
);
create index on public.notifications (tenant_id, created_at desc);
create trigger notifications_updated before update on public.notifications for each row execute function private.set_updated_at();

create table public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  notification_id uuid not null,
  contact_id uuid not null,
  channel text not null check (channel in ('whatsapp','sms','email')),
  idempotency_key text not null unique,
  status text not null default 'queued' check (status in ('queued','submitted','sent','delivered','read','failed','retrying','skipped')),
  skip_reason text,
  provider_message_id text,
  attempts integer not null default 0,
  next_attempt_at timestamptz default now(),
  error_code text,
  is_permanent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, notification_id) references public.notifications (tenant_id, id) on delete cascade,
  foreign key (tenant_id, contact_id) references public.contacts (tenant_id, id)
);
create index notification_recipients_due on public.notification_recipients (next_attempt_at) where status in ('queued','retrying');
create index on public.notification_recipients (tenant_id, notification_id, status);
create index on public.notification_recipients (provider_message_id) where provider_message_id is not null;
create trigger recipients_updated before update on public.notification_recipients for each row execute function private.set_updated_at();

create table public.notification_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  recipient_id uuid not null,
  status text not null,
  provider_event_id text,
  occurred_at timestamptz not null default now(),
  raw jsonb,
  unique (recipient_id, provider_event_id),
  foreign key (tenant_id, recipient_id) references public.notification_recipients (tenant_id, id) on delete cascade
);

-- Webhook intake for idempotency/replay protection. Service role only (RLS on, no policies, no grants).
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

do $$
declare t text;
begin
  foreach t in array array['notification_templates','notifications','notification_recipients','notification_events','webhook_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

grant select, insert, update on public.notification_templates to authenticated;
create policy tpl_select on public.notification_templates for select to authenticated
  using (private.has_permission(tenant_id, 'communications.view') and private.has_module_access(tenant_id, 'core.notify'));
create policy tpl_insert on public.notification_templates for insert to authenticated
  with check (private.has_permission(tenant_id, 'communications.send') and private.has_module_access(tenant_id, 'core.notify') and private.is_writable(tenant_id) and provider_status = 'draft');
create policy tpl_update on public.notification_templates for update to authenticated
  using (private.has_permission(tenant_id, 'communications.send') and private.is_writable(tenant_id) and provider_status = 'draft')
  with check (private.has_permission(tenant_id, 'communications.send') and provider_status = 'draft');

grant select on public.notifications, public.notification_recipients, public.notification_events to authenticated;
create policy notif_select on public.notifications for select to authenticated using (private.has_permission(tenant_id, 'communications.view') and private.has_module_access(tenant_id, 'core.notify'));
create policy recip_select on public.notification_recipients for select to authenticated using (private.has_permission(tenant_id, 'communications.view') and private.has_module_access(tenant_id, 'core.notify'));
create policy events_select on public.notification_events for select to authenticated using (private.has_permission(tenant_id, 'communications.view'));
-- No insert/update/delete grants on notifications, recipients or events: only the RPCs below and the service-role worker write them.

-- Audience resolution. Industry audiences (e.g. {"type":"bus","bus_id":...}) are added by later industry migrations.
create or replace function private.resolve_audience(p_tenant uuid, p_audience jsonb) returns setof uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_audience->>'type' = 'all' then
    return query select id from public.contacts where tenant_id = p_tenant and deleted_at is null and status = 'active';
  elsif p_audience->>'type' = 'contacts' then
    if jsonb_array_length(p_audience->'contact_ids') > 10000 then raise exception 'audience too large' using errcode = '22023'; end if;
    return query select c.id from public.contacts c
      where c.tenant_id = p_tenant and c.deleted_at is null
        and c.id in (select (jsonb_array_elements_text(p_audience->'contact_ids'))::uuid);
  else
    raise exception 'unsupported audience type' using errcode = '22023';
  end if;
end $$;

create or replace function public.create_notification(p_tenant uuid, p_title text, p_channel text, p_fallback_channel text, p_template_id uuid,
  p_body text, p_audience jsonb, p_scheduled_at timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_queued int;
begin
  if not private.has_permission(p_tenant, 'communications.send') then raise exception 'not allowed' using errcode = '42501'; end if;
  if not private.has_module_access(p_tenant, 'core.notify') then raise exception 'notification module is not enabled' using errcode = '42501'; end if;
  if not private.is_writable(p_tenant) then raise exception 'organisation is read-only or not active' using errcode = '42501'; end if;
  if p_channel not in ('whatsapp','sms','email') or coalesce(trim(p_body), '') = '' then raise exception 'invalid notification' using errcode = '22023'; end if;

  insert into public.notifications (tenant_id, title, channel, fallback_channel, template_id, body, audience_definition, scheduled_at, status)
  values (p_tenant, left(coalesce(nullif(trim(p_title), ''), 'Untitled'), 160), p_channel, p_fallback_channel, p_template_id, p_body, p_audience, p_scheduled_at,
          case when p_scheduled_at is null or p_scheduled_at <= now() then 'queued' else 'scheduled' end)
  returning id into v_id;

  insert into public.notification_recipients (tenant_id, notification_id, contact_id, channel, idempotency_key, status, skip_reason)
  select p_tenant, v_id, c.id, p_channel, md5(v_id::text || c.id::text || p_channel),
    case when cp.consent_status = 'opted_in' and ((p_channel = 'email' and ct.email is not null) or (p_channel <> 'email' and ct.phone_e164 is not null)) then 'queued' else 'skipped' end,
    case when cp.consent_status = 'opted_out' then 'opted_out'
         when cp.consent_status is distinct from 'opted_in' then 'no_consent'
         when (p_channel = 'email' and ct.email is null) or (p_channel <> 'email' and ct.phone_e164 is null) then 'no_address' end
  from private.resolve_audience(p_tenant, p_audience) as c(id)
  join public.contacts ct on ct.id = c.id and ct.tenant_id = p_tenant
  left join public.communication_preferences cp on cp.tenant_id = p_tenant and cp.contact_id = c.id and cp.channel = p_channel;

  select count(*) into v_queued from public.notification_recipients where notification_id = v_id and status = 'queued';
  update public.notifications set recipient_count = v_queued where id = v_id;
  return v_id;
end $$;

create or replace function public.retry_notification_recipient(p_recipient uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.notification_recipients;
begin
  select * into r from public.notification_recipients where id = p_recipient;
  if r.id is null or not private.has_permission(r.tenant_id, 'communications.send') or not private.is_writable(r.tenant_id) then
    raise exception 'not allowed' using errcode = '42501'; end if;
  if r.status <> 'failed' or r.is_permanent then raise exception 'only transient failures can be retried' using errcode = '23514'; end if;
  update public.notification_recipients set status = 'retrying', next_attempt_at = now() where id = p_recipient;
end $$;

revoke all on function public.create_notification(uuid,text,text,text,uuid,text,jsonb,timestamptz) from public, anon;
revoke all on function public.retry_notification_recipient(uuid) from public, anon;
grant execute on function public.create_notification(uuid,text,text,text,uuid,text,jsonb,timestamptz) to authenticated;
grant execute on function public.retry_notification_recipient(uuid) to authenticated;
