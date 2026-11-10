-- Harden the pre-existing Figma scaffold helper without removing its DDL event trigger.
-- The event trigger executes as its owner; API roles do not need direct RPC execution rights.
create or replace function public.novagrid_schema_version()
returns integer
language sql
stable
set search_path = ''
as $$ select 9 $$;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;
