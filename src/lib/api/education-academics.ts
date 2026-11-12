import {supabase} from '../supabase'
import {run,toBackendError} from './errors'
export type EduTimetableEntry={id:string;tenant_id:string;class_id:string;weekday:number;period_number:number;subject:string;teacher_contact_id:string|null;starts_at:string;ends_at:string;room:string|null}
export type EduExam={id:string;tenant_id:string;name:string;academic_year:string;starts_on:string;ends_on:string;status:'planned'|'ongoing'|'completed'|'cancelled'}
export type EduExamSubject={id:string;tenant_id:string;exam_id:string;class_id:string;subject:string;exam_date:string;max_marks:number;pass_marks:number}
export type EduExamResult={id:string;tenant_id:string;exam_subject_id:string;enrolment_id:string;marks:number;remarks:string|null;enrolment?:{student?:{full_name:string}|null;roll_number:string|null}|null}
export async function listEduAcademics(tenantId:string){const [t,e,s,r]=await Promise.all([
 supabase.from('edu_timetable_entries').select('*,klass:edu_classes(name,section)').eq('tenant_id',tenantId).order('weekday').order('period_number'),
 supabase.from('edu_exams').select('*').eq('tenant_id',tenantId).order('starts_on',{ascending:false}),
 supabase.from('edu_exam_subjects').select('*,klass:edu_classes(name,section)').eq('tenant_id',tenantId).order('exam_date'),
 supabase.from('edu_exam_results').select('*,enrolment:edu_enrolments(roll_number,student:contacts!edu_enrolments_student_contact_id_fkey(full_name))').eq('tenant_id',tenantId)
]);for(const q of [t,e,s,r])if(q.error)throw toBackendError(q.error);return {timetable:(t.data??[]) as EduTimetableEntry[],exams:(e.data??[]) as EduExam[],subjects:(s.data??[]) as EduExamSubject[],results:(r.data??[]) as unknown as EduExamResult[]}}
export async function saveEduTimetable(tenantId:string,x:Omit<EduTimetableEntry,'id'|'tenant_id'>){return run(supabase.from('edu_timetable_entries').upsert({tenant_id:tenantId,...x},{onConflict:'tenant_id,class_id,weekday,period_number'}).select().single())}
export async function createEduExam(tenantId:string,x:Pick<EduExam,'name'|'academic_year'|'starts_on'|'ends_on'>){return run(supabase.from('edu_exams').insert({tenant_id:tenantId,...x}).select().single())}
export async function createEduExamSubject(tenantId:string,x:Pick<EduExamSubject,'exam_id'|'class_id'|'subject'|'exam_date'|'max_marks'|'pass_marks'>){return run(supabase.from('edu_exam_subjects').insert({tenant_id:tenantId,...x}).select().single())}
export async function saveEduResult(tenantId:string,x:Pick<EduExamResult,'exam_subject_id'|'enrolment_id'|'marks'|'remarks'>){return run(supabase.from('edu_exam_results').upsert({tenant_id:tenantId,...x},{onConflict:'tenant_id,exam_subject_id,enrolment_id'}).select().single())}
