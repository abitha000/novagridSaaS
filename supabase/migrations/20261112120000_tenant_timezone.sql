-- Phase 11: tenant timezone for local gym schedules.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path = '' as $$ select 18 $$;

alter table public.organisations
 add column if not exists timezone text not null default 'Asia/Kolkata'
 check (char_length(timezone) between 1 and 64);

create or replace function private.validate_organisation_timezone()
returns trigger language plpgsql set search_path=''
as $$
begin
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then
  raise exception using errcode='22023',message='Invalid IANA timezone.';
 end if;
 return new;
end $$;
drop trigger if exists organisations_timezone_valid on public.organisations;
create trigger organisations_timezone_valid before insert or update of timezone on public.organisations
for each row execute function private.validate_organisation_timezone();

create or replace function private.enforce_gym_trainer_availability()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_timezone text; local_day date; local_weekday integer; local_start time; local_end time;
begin
 if new.status <> 'scheduled' then return new; end if;
 select timezone into v_timezone from public.organisations where id=new.tenant_id;
 if v_timezone is null then v_timezone := 'Asia/Kolkata'; end if;
 local_day := (new.starts_at at time zone v_timezone)::date;
 local_weekday := extract(dow from local_day)::integer;
 local_start := (new.starts_at at time zone v_timezone)::time;
 local_end := (new.ends_at at time zone v_timezone)::time;

 if exists(select 1 from public.gym_trainer_availability a where a.tenant_id=new.tenant_id and a.trainer_id=new.trainer_id and a.weekday=local_weekday)
 and not exists(select 1 from public.gym_trainer_availability a where a.tenant_id=new.tenant_id and a.trainer_id=new.trainer_id and a.weekday=local_weekday and a.starts_at<=local_start and a.ends_at>=local_end) then
  raise exception using errcode='23514',message='Session is outside the trainer working hours.';
 end if;
 if exists(select 1 from public.gym_trainer_time_off t where t.tenant_id=new.tenant_id and t.trainer_id=new.trainer_id and t.starts_at<new.ends_at and t.ends_at>new.starts_at) then
  raise exception using errcode='23514',message='Trainer is marked unavailable during this time.';
 end if;
 return new;
end $$;
revoke all on function private.enforce_gym_trainer_availability() from public,anon,authenticated;
