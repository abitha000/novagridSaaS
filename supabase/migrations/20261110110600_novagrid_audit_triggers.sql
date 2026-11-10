-- NOVAGRID audit triggers with sensitive contact fields redacted.
create or replace function public.novagrid_schema_version() returns integer language sql stable set search_path = '' as $$ select 7 $$;

create or replace function private.audit_row() returns trigger language plpgsql security definer set search_path = '' as $$
declare b jsonb; a jsonb; v jsonb; t uuid;
begin
  if tg_op in ('UPDATE','DELETE') then
    b := to_jsonb(old) - 'phone_e164' - 'email' - 'owner_phone' - 'owner_email' - 'attributes' - 'body' - 'raw' - 'payload';
  end if;
  if tg_op in ('INSERT','UPDATE') then
    a := to_jsonb(new) - 'phone_e164' - 'email' - 'owner_phone' - 'owner_email' - 'attributes' - 'body' - 'raw' - 'payload';
  end if;
  v := coalesce(a, b);
  t := case when tg_table_name = 'organisations' then (v->>'id')::uuid else (v->>'tenant_id')::uuid end;
  insert into public.audit_logs (tenant_id, actor_id, actor_type, action, entity, entity_id, before_data, after_data)
  values (t, auth.uid(), case when auth.uid() is null then 'system' else 'user' end, lower(tg_op), tg_table_name, v->>'id', b, a);
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['organisations','organisation_approvals','subscriptions','tenant_users','contacts','communication_preferences','notification_templates','notifications'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.audit_row()', 'audit_' || t, t);
  end loop;
end $$;
-- organisation_approvals has no tenant_id column: it audits with a null tenant (platform-level log).
-- Revoke direct writes to audit_logs from every API role (already done in 0004; asserted here).
revoke insert, update, delete, truncate on public.audit_logs from anon, authenticated;
