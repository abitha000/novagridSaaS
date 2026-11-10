-- NOVAGRID final pre-production hardening.
-- Keep the legacy Figma RLS event trigger installed, but prevent it being invoked through PostgREST RPC.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path = '' as $$ select 9 $$;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
