-- Phase 13: link immutable payment records to gym memberships for balance reconciliation.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path = '' as $$ select 20 $$;

alter table public.payment_records add column if not exists membership_id uuid;
alter table public.payment_records add constraint payment_records_membership_fk
 foreign key (tenant_id,membership_id) references public.gym_memberships(tenant_id,id);
create index payment_records_membership on public.payment_records(tenant_id,membership_id,paid_at desc)
 where membership_id is not null;

create or replace function private.validate_membership_payment_link()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_contact uuid;
begin
 if new.membership_id is null then return new; end if;
 select contact_id into v_contact from public.gym_memberships
  where tenant_id=new.tenant_id and id=new.membership_id;
 if v_contact is null or v_contact<>new.contact_id then
  raise exception using errcode='23514',message='Payment must belong to the selected membership member.';
 end if;
 if not private.has_module_access(new.tenant_id,'gym.memberships') then
  raise exception using errcode='42501',message='Gym membership module is not enabled.';
 end if;
 return new;
end $$;
revoke all on function private.validate_membership_payment_link() from public,anon,authenticated;
create trigger payment_records_membership_link before insert on public.payment_records
for each row execute function private.validate_membership_payment_link();
