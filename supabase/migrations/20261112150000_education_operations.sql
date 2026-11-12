-- Phase 6 foundation: tenant-isolated education classes, enrolments, attendance and fee assessments.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path='' as $$ select 21 $$;

create table public.edu_classes(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.organisations(id) on delete cascade,
 name text not null check(char_length(name) between 2 and 120), academic_year text not null check(char_length(academic_year) between 4 and 20),
 section text not null default 'A' check(char_length(section) between 1 and 20), teacher_contact_id uuid,
 is_active boolean not null default true, created_by uuid not null default auth.uid(), created_at timestamptz not null default now(),
 unique(tenant_id,id), unique(tenant_id,academic_year,name,section),
 foreign key(tenant_id,teacher_contact_id) references public.contacts(tenant_id,id)
);
create table public.edu_enrolments(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.organisations(id) on delete cascade,
 class_id uuid not null, student_contact_id uuid not null, roll_number text,
 status text not null default 'active' check(status in ('active','transferred','withdrawn')),
 enrolled_on date not null default current_date, created_at timestamptz not null default now(),
 unique(tenant_id,id), unique(tenant_id,class_id,student_contact_id),
 foreign key(tenant_id,class_id) references public.edu_classes(tenant_id,id),
 foreign key(tenant_id,student_contact_id) references public.contacts(tenant_id,id)
);
create unique index edu_enrolment_roll_unique on public.edu_enrolments(tenant_id,class_id,roll_number) where roll_number is not null;
create table public.edu_attendance(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, enrolment_id uuid not null,
 attendance_date date not null, status text not null check(status in ('present','absent','late','excused')),
 notes text check(notes is null or char_length(notes)<=300), marked_by uuid default auth.uid(), created_at timestamptz not null default now(),
 unique(tenant_id,enrolment_id,attendance_date),
 foreign key(tenant_id,enrolment_id) references public.edu_enrolments(tenant_id,id)
);
create table public.edu_fee_assessments(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.organisations(id) on delete cascade,
 enrolment_id uuid not null, title text not null check(char_length(title) between 2 and 120),
 amount_paise bigint not null check(amount_paise>0 and amount_paise<=100000000000),
 due_date date not null, status text not null default 'due' check(status in ('due','waived','cancelled')),
 notes text check(notes is null or char_length(notes)<=500), created_by uuid default auth.uid(), created_at timestamptz not null default now(),
 unique(tenant_id,id), foreign key(tenant_id,enrolment_id) references public.edu_enrolments(tenant_id,id)
);
create index edu_classes_tenant_year on public.edu_classes(tenant_id,academic_year,is_active);
create index edu_enrolments_class on public.edu_enrolments(tenant_id,class_id,status);
create index edu_attendance_date on public.edu_attendance(tenant_id,attendance_date desc);
create index edu_fee_due on public.edu_fee_assessments(tenant_id,due_date,status);
do $$ declare t text; begin
 foreach t in array array['edu_classes','edu_enrolments','edu_attendance','edu_fee_assessments'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('alter table public.%I force row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
grant select,insert,update on public.edu_classes,public.edu_enrolments,public.edu_attendance,public.edu_fee_assessments to authenticated;
create policy edu_classes_read on public.edu_classes for select to authenticated using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'edu.classes'));
create policy edu_classes_write on public.edu_classes for all to authenticated using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.classes') and private.is_writable(tenant_id)) with check(private.has_permission(tenant_id,'contacts.create') and private.has_module_access(tenant_id,'edu.classes') and private.is_writable(tenant_id));
create policy edu_enrolments_read on public.edu_enrolments for select to authenticated using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'edu.students'));
create policy edu_enrolments_write on public.edu_enrolments for all to authenticated using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.students') and private.is_writable(tenant_id)) with check(private.has_permission(tenant_id,'contacts.create') and private.has_module_access(tenant_id,'edu.students') and private.is_writable(tenant_id));
create policy edu_attendance_read on public.edu_attendance for select to authenticated using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'edu.attendance'));
create policy edu_attendance_write on public.edu_attendance for all to authenticated using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.attendance') and private.is_writable(tenant_id)) with check(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.attendance') and private.is_writable(tenant_id));
create policy edu_fees_read on public.edu_fee_assessments for select to authenticated using(private.has_permission(tenant_id,'payments.view') and private.has_module_access(tenant_id,'edu.fees'));
create policy edu_fees_write on public.edu_fee_assessments for all to authenticated using(private.has_permission(tenant_id,'payments.create') and private.has_module_access(tenant_id,'edu.fees') and private.is_writable(tenant_id)) with check(private.has_permission(tenant_id,'payments.create') and private.has_module_access(tenant_id,'edu.fees') and private.is_writable(tenant_id));
