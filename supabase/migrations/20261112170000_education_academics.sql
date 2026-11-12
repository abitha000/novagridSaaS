-- Phase 8: tenant-scoped timetables, examinations and student results.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path='' as $$ select 23 $$;

create table public.edu_timetable_entries(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null, class_id uuid not null,
 weekday smallint not null check(weekday between 1 and 7),period_number smallint not null check(period_number between 1 and 20),
 subject text not null check(char_length(subject) between 2 and 100),teacher_contact_id uuid,
 starts_at time not null,ends_at time not null,room text check(room is null or char_length(room)<=40),
 created_at timestamptz not null default now(),unique(tenant_id,id),unique(tenant_id,class_id,weekday,period_number),
 foreign key(tenant_id,class_id) references public.edu_classes(tenant_id,id),
 foreign key(tenant_id,teacher_contact_id) references public.contacts(tenant_id,id),
 check(ends_at>starts_at)
);
create table public.edu_exams(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.organisations(id) on delete cascade,
 name text not null check(char_length(name) between 2 and 120),academic_year text not null check(char_length(academic_year) between 4 and 20),
 starts_on date not null,ends_on date not null,status text not null default 'planned' check(status in ('planned','ongoing','completed','cancelled')),
 created_at timestamptz not null default now(),unique(tenant_id,id),check(ends_on>=starts_on)
);
create table public.edu_exam_subjects(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,exam_id uuid not null,class_id uuid not null,
 subject text not null check(char_length(subject) between 2 and 100),exam_date date not null,
 max_marks numeric(7,2) not null check(max_marks>0 and max_marks<=100000),
 pass_marks numeric(7,2) not null check(pass_marks>=0 and pass_marks<=max_marks),
 created_at timestamptz not null default now(),unique(tenant_id,id),unique(tenant_id,exam_id,class_id,subject),
 foreign key(tenant_id,exam_id) references public.edu_exams(tenant_id,id),
 foreign key(tenant_id,class_id) references public.edu_classes(tenant_id,id)
);
create table public.edu_exam_results(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,exam_subject_id uuid not null,enrolment_id uuid not null,
 marks numeric(7,2) not null check(marks>=0),remarks text check(remarks is null or char_length(remarks)<=300),
 entered_by uuid default auth.uid(),created_at timestamptz not null default now(),unique(tenant_id,id),unique(tenant_id,exam_subject_id,enrolment_id),
 foreign key(tenant_id,exam_subject_id) references public.edu_exam_subjects(tenant_id,id),
 foreign key(tenant_id,enrolment_id) references public.edu_enrolments(tenant_id,id)
);
create or replace function private.validate_edu_exam_result()
returns trigger language plpgsql set search_path='' as $edu_exam_fn$
declare v_max numeric;v_class uuid;v_enrolment_class uuid;
begin
 select max_marks,class_id into v_max,v_class from public.edu_exam_subjects where tenant_id=new.tenant_id and id=new.exam_subject_id;
 if not found then raise exception using errcode='23503',message='Examination subject does not exist for this tenant.';end if;
 select class_id into v_enrolment_class from public.edu_enrolments where tenant_id=new.tenant_id and id=new.enrolment_id and status='active';
 if not found or v_enrolment_class<>v_class then raise exception using errcode='23514',message='Result student must have an active enrolment in the subject class.';end if;
 if new.marks>v_max then raise exception using errcode='23514',message='Marks cannot exceed the subject maximum.';end if;
 return new;
end $edu_exam_fn$;
revoke all on function private.validate_edu_exam_result() from public,anon,authenticated;
create trigger edu_exam_result_validate before insert or update on public.edu_exam_results for each row execute function private.validate_edu_exam_result();
create index edu_timetable_lookup on public.edu_timetable_entries(tenant_id,class_id,weekday,period_number);
create index edu_exam_dates on public.edu_exams(tenant_id,starts_on desc);
create index edu_exam_results_subject on public.edu_exam_results(tenant_id,exam_subject_id);
do $$ declare t text;begin foreach t in array array['edu_timetable_entries','edu_exams','edu_exam_subjects','edu_exam_results'] loop
 execute format('alter table public.%I enable row level security',t);execute format('alter table public.%I force row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
end loop;end $$;
grant select,insert,update on public.edu_timetable_entries,public.edu_exams,public.edu_exam_subjects,public.edu_exam_results to authenticated;
create policy edu_timetable_read on public.edu_timetable_entries for select to authenticated using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'edu.timetables'));
create policy edu_timetable_write on public.edu_timetable_entries for all to authenticated using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.timetables') and private.is_writable(tenant_id)) with check(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.timetables') and private.is_writable(tenant_id));
create policy edu_exams_read on public.edu_exams for select to authenticated using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'edu.exams'));
create policy edu_exams_write on public.edu_exams for all to authenticated using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.exams') and private.is_writable(tenant_id)) with check(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.exams') and private.is_writable(tenant_id));
create policy edu_exam_subjects_read on public.edu_exam_subjects for select to authenticated using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'edu.exams'));
create policy edu_exam_subjects_write on public.edu_exam_subjects for all to authenticated using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.exams') and private.is_writable(tenant_id)) with check(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.exams') and private.is_writable(tenant_id));
create policy edu_exam_results_read on public.edu_exam_results for select to authenticated using(private.has_permission(tenant_id,'contacts.view') and private.has_module_access(tenant_id,'edu.exams'));
create policy edu_exam_results_write on public.edu_exam_results for all to authenticated using(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.exams') and private.is_writable(tenant_id)) with check(private.has_permission(tenant_id,'contacts.edit') and private.has_module_access(tenant_id,'edu.exams') and private.is_writable(tenant_id));
