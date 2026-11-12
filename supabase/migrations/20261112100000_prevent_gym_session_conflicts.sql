-- Phase 9: prevent overlapping scheduled gym sessions.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path = '' as $$ select 16 $$;

create or replace function private.prevent_gym_training_session_conflicts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'scheduled' then
    return new;
  end if;

  -- Serialize writes for the trainer to prevent concurrent overlapping bookings.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.tenant_id::text || ':' || new.trainer_id::text, 0)
  );

  if exists (
    select 1
    from public.gym_training_sessions s
    where s.tenant_id = new.tenant_id
      and s.trainer_id = new.trainer_id
      and s.status = 'scheduled'
      and s.id is distinct from new.id
      and s.starts_at < new.ends_at
      and s.ends_at > new.starts_at
  ) then
    raise exception using
      errcode = '23P01',
      message = 'Trainer already has a scheduled session during this time.';
  end if;

  -- A member cannot be booked into two sessions at the same time either.
  if exists (
    select 1
    from public.gym_training_sessions s
    where s.tenant_id = new.tenant_id
      and s.member_contact_id = new.member_contact_id
      and s.status = 'scheduled'
      and s.id is distinct from new.id
      and s.starts_at < new.ends_at
      and s.ends_at > new.starts_at
  ) then
    raise exception using
      errcode = '23P01',
      message = 'Member already has a scheduled session during this time.';
  end if;

  return new;
end;
$$;

drop trigger if exists gym_training_session_conflicts on public.gym_training_sessions;
create trigger gym_training_session_conflicts
before insert or update of tenant_id,trainer_id,member_contact_id,starts_at,ends_at,status
on public.gym_training_sessions
for each row execute function private.prevent_gym_training_session_conflicts();

revoke all on function private.prevent_gym_training_session_conflicts() from public, anon, authenticated;
