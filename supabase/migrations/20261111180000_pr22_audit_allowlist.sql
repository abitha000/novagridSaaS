-- PR #22: replace audit JSON denylisting with a strict field allowlist.
-- Names, addresses, contact details, free text, message bodies and provider payloads
-- are excluded by default; newly added columns are never logged automatically.

create or replace function private.audit_safe_row(p_row jsonb)
returns jsonb
language sql
immutable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb)
  from jsonb_each(coalesce(p_row,'{}'::jsonb)) e
  where e.key = any(array[
    'id','tenant_id','organisation_id','industry_category_id',
    'requested_category_id','assigned_category_id','plan_id','subscription_id',
    'role_id','permission_id','user_id','contact_id','notification_id',
    'status','approval_status','lifecycle_status','decision',
    'actor_type','action','entity','entity_id','channel','fallback_channel',
    'provider_status','consent_status','type','scope','key',
    'recipient_count','attempts','is_permanent','quantity',
    'period_start','period_end','grace_until','scheduled_at',
    'created_at','updated_at','decided_at','suspended_at',
    'deleted_at','email_verified_at','phone_verified_at'
  ]);
$$;
revoke all on function private.audit_safe_row(jsonb) from public,anon,authenticated,service_role;

create or replace function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  b jsonb;
  a jsonb;
  v jsonb;
  t uuid;
begin
  if tg_op in ('UPDATE','DELETE') then
    b := private.audit_safe_row(to_jsonb(old));
  end if;
  if tg_op in ('INSERT','UPDATE') then
    a := private.audit_safe_row(to_jsonb(new));
  end if;
  v := coalesce(a,b);
  t := case
    when tg_table_name='organisations' then (v->>'id')::uuid
    when tg_table_name='subscriptions' then (v->>'organisation_id')::uuid
    else (v->>'tenant_id')::uuid
  end;
  insert into public.audit_logs(tenant_id,actor_id,actor_type,action,entity,entity_id,before_data,after_data)
  values(t,auth.uid(),case when auth.uid() is null then 'system' else 'user' end,
    lower(tg_op),tg_table_name,v->>'id',b,a);
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function private.audit_row() from public,anon,authenticated,service_role;
