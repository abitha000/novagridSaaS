-- 0001_foundation.sql  (PROPOSED - not applied)
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function public.novagrid_schema_version() returns integer
language sql stable set search_path = '' as $$ select 1 $$;
revoke all on function public.novagrid_schema_version() from public;
grant execute on function public.novagrid_schema_version() to anon, authenticated;

create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
