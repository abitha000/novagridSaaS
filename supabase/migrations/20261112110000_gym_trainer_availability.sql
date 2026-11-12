-- Phase 10: weekly trainer availability and date-specific leave.
-- Weekly schedule clock values are stored and evaluated in UTC; organisation timezone support can be layered in separately.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path = '' as $$ select 17 $$;

create table public.gym_trainer_availability (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.organisations(id) on delete cascade,
 trainer_id uuid not null,
 weekday smallint not null check (weekday between 0 and 6),
 starts_at time not null,
 ends_at time not null,
 created_at timestamptz not null default now(),
 check (ends_at > starts_at),
 foreign key (tenant_id,trainer_id) references public.gym_trainers(tenant_id,id)
);
create index gym_trainer_availability_lookup on public.gym_trainer_availability(tenant_id,trainer_id,weekday);
create table public.gym_trainer_time_off (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.organisations(id) on delete cascade,
 trainer_id uuid not null,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 reason text check (reason is null or char_length(reason)<=300),
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 check (ends_at > starts_at),
 foreign key (tenant_id,trainer_id) references public.gym_trainers(tenant_id,id)
);
create index gym_trainer_time_off_lookup on public.gym_trainer_time_off(tenant_id,trainer_id,starts_at,ends_at);
alter table public.gym_trainer_availability enable row level security;
alter table public.gym_trainer_availability force row level security;
alter table public.gym_trainer_time_off enable row level security;
alter table public.gym_trainer_time_off force row level security;
revoke all on public.gym_trainer_availability,public.gym_trainer_time_off from anon,authenticated;
grant select,insert,update,delete on public.gym_trainer_availability to authenticated;
grant select,insert,update,delete on public.gym_trainer_time_off to authenticated;
create policy gym_trainer_availability_read on public.gym_trainer_availability for select to authenticated
 using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'gym.trainers'));
create policy gym_trainer_availability_write on public.gym_trainer_availability for all to authenticated
 using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'gym.trainers') and private.is_writable(tenant_id))
 with check(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'gym.trainers') and private.is_writable(tenant_id));
create policy gym_trainer_time_off_read on public.gym_trainer_time_off for select to authenticated
 using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'gym.trainers'));
create policy gym_trainer_time_off_write on public.gym_trainer_time_off for all to authenticated
 using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'gym.trainers') and private.is_writable(tenant_id))
 with check(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'gym.trainers') and private.is_writable(tenant_id) and created_by=auth.uid());

create or replace function private.enforce_gym_trainer_availability()
returns trigger language plpgsql security definer set search_path=''
as $$
declare local_weekday integer; local_start time; local_end time; local_day date;
begin
 if new.status <> 'scheduled' then return new; end if;
 local_day := (new.starts_at at time zone 'UTC')::date;
 local_weekday := extract(dow from local_day)::integer;
 local_start := new.starts_at at time zone 'UTC';
 local_end := new.ends_at at time zone 'UTC';

 if exists(select 1 from public.gym_trainer_availability a
  where a.tenant_id=new.tenant_id and a.trainer_id=new.trainer_id and a.weekday=local_weekday)
 and not exists(select 1 from public.gym_trainer_availability a
  where a.tenant_id=new.tenant_id and a.trainer_id=new.trainer_id and a.weekday=local_weekday
   and a.starts_at<=local_start and a.ends_at>=local_end) then
  raise exception using errcode='23514',message='Session is outside the trainer working hours.';
 end if;
 if exists(select 1 from public.gym_trainer_time_off t
  where t.tenant_id=new.tenant_id and t.trainer_id=new.trainer_id
   and t.starts_at<new.ends_at and t.ends_at>new.starts_at) then
  raise exception using errcode='23514',message='Trainer is marked unavailable during this time.';
 end if;
 return new;
end $$;
drop trigger if exists gym_training_session_availability on public.gym_training_sessions;
create trigger gym_training_session_availability before insert or update of tenant_id,trainer_id,starts_at,ends_at,status
on public.gym_training_sessions for each row execute function private.enforce_gym_trainer_availability();
revoke all on function private.enforce_gym_trainer_availability() from public,anon,authenticated;
