-- Phase 7: tenant-scoped school transport fleet, routes, stops and student allocation.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path='' as $$ select 22 $$;

create table public.edu_vehicles(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.organisations(id) on delete cascade,
 registration_number text not null check(char_length(registration_number) between 4 and 20),
 vehicle_type text not null default 'bus' check(vehicle_type in ('bus','van','car')),
 capacity integer not null check(capacity between 1 and 100),driver_name text not null check(char_length(driver_name) between 2 and 100),
 driver_phone text check(driver_phone is null or char_length(driver_phone)<=20),
 is_active boolean not null default true,created_at timestamptz not null default now(),
 unique(tenant_id,id),unique(tenant_id,registration_number)
);
create table public.edu_routes(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.organisations(id) on delete cascade,
 name text not null check(char_length(name) between 2 and 100),direction text not null default 'both' check(direction in ('pickup','drop','both')),
 vehicle_id uuid, is_active boolean not null default true,created_at timestamptz not null default now(),
 unique(tenant_id,id),unique(tenant_id,name),
 foreign key(tenant_id,vehicle_id) references public.edu_vehicles(tenant_id,id)
);
create table public.edu_route_stops(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,route_id uuid not null,
 name text not null check(char_length(name) between 2 and 120),sequence integer not null check(sequence between 1 and 200),
 pickup_time time,drop_time time,fee_paise bigint not null default 0 check(fee_paise>=0 and fee_paise<=100000000000),
 created_at timestamptz not null default now(),unique(tenant_id,id),unique(tenant_id,route_id,sequence),unique(tenant_id,route_id,name),
 foreign key(tenant_id,route_id) references public.edu_routes(tenant_id,id)
);
create table public.edu_transport_allocations(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,route_id uuid not null,stop_id uuid not null,enrolment_id uuid not null,
 start_date date not null default current_date,end_date date,status text not null default 'active' check(status in ('active','ended')),
 created_at timestamptz not null default now(),unique(tenant_id,id),
 foreign key(tenant_id,route_id) references public.edu_routes(tenant_id,id),
 foreign key(tenant_id,stop_id) references public.edu_route_stops(tenant_id,id),
 foreign key(tenant_id,enrolment_id) references public.edu_enrolments(tenant_id,id),
 check(end_date is null or end_date>=start_date)
);
create unique index edu_transport_one_active on public.edu_transport_allocations(tenant_id,enrolment_id) where status='active';
create index edu_route_stops_order on public.edu_route_stops(tenant_id,route_id,sequence);
create index edu_transport_route on public.edu_transport_allocations(tenant_id,route_id,status);
do $$ declare t text;begin foreach t in array array['edu_vehicles','edu_routes','edu_route_stops','edu_transport_allocations'] loop
 execute format('alter table public.%I enable row level security',t);execute format('alter table public.%I force row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);
end loop;end $$;
grant select,insert,update on public.edu_vehicles,public.edu_routes,public.edu_route_stops,public.edu_transport_allocations to authenticated;
create policy edu_vehicles_read on public.edu_vehicles for select to authenticated using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'edu.transport'));
create policy edu_vehicles_write on public.edu_vehicles for all to authenticated using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.transport') and private.is_writable(tenant_id)) with check(private.has_permission(tenant_id,'contacts.create') and private.has_module_access(tenant_id,'edu.transport') and private.is_writable(tenant_id));
create policy edu_routes_read on public.edu_routes for select to authenticated using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'edu.transport'));
create policy edu_routes_write on public.edu_routes for all to authenticated using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.transport') and private.is_writable(tenant_id)) with check(private.has_permission(tenant_id,'contacts.create') and private.has_module_access(tenant_id,'edu.transport') and private.is_writable(tenant_id));
create policy edu_stops_read on public.edu_route_stops for select to authenticated using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'edu.transport'));
create policy edu_stops_write on public.edu_route_stops for all to authenticated using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.transport') and private.is_writable(tenant_id)) with check(private.has_permission(tenant_id,'contacts.create') and private.has_module_access(tenant_id,'edu.transport') and private.is_writable(tenant_id));
create policy edu_allocations_read on public.edu_transport_allocations for select to authenticated using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'edu.transport'));
create policy edu_allocations_write on public.edu_transport_allocations for all to authenticated using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.transport') and private.is_writable(tenant_id)) with check(private.has_permission(tenant_id,'contacts.create') and private.has_module_access(tenant_id,'edu.transport') and private.is_writable(tenant_id));
create or replace function private.validate_edu_transport_allocation()
returns trigger language plpgsql set search_path='' as $$
declare v_capacity integer;v_count integer;v_route uuid;
begin
 if new.status<>'active' then return new;end if;
 select vehicle.capacity into v_capacity from public.edu_routes r left join public.edu_vehicles vehicle on vehicle.tenant_id=r.tenant_id and vehicle.id=r.vehicle_id where r.tenant_id=new.tenant_id and r.id=new.route_id and r.is_active;
 if not found then raise exception using errcode='23514',message='Transport route is inactive or unavailable.';end if;
 if not exists(select 1 from public.edu_route_stops s where s.tenant_id=new.tenant_id and s.route_id=new.route_id and s.id=new.stop_id) then raise exception using errcode='23514',message='Selected stop does not belong to this route.';end if;
 if not exists(select 1 from public.edu_enrolments e where e.tenant_id=new.tenant_id and e.id=new.enrolment_id and e.status='active') then raise exception using errcode='23514',message='Transport can only be assigned to an active student enrolment.';end if;
 if v_capacity is not null then select count(*) into v_count from public.edu_transport_allocations a where a.tenant_id=new.tenant_id and a.route_id=new.route_id and a.status='active' and a.id<>new.id;
 if v_count>=v_capacity then raise exception using errcode='23514',message='Vehicle capacity reached.';end if;end if;
 return new;
end $$;
revoke all on function private.validate_edu_transport_allocation() from public,anon,authenticated;
create trigger edu_transport_allocation_validate before insert or update on public.edu_transport_allocations for each row execute function private.validate_edu_transport_allocation();
