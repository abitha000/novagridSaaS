import { supabase } from '../supabase'
import { BackendError, run, toBackendError } from './errors'

export type GymTrainingSession = {
 id:string; tenant_id:string; trainer_id:string; member_contact_id:string;
 starts_at:string; ends_at:string; session_type:string;
 status:'scheduled'|'completed'|'cancelled'|'no_show'; notes:string|null;
 trainer?:{contact:{full_name:string}|null}|null;
 member?:{full_name:string}|null
}
export type GymTrainingSessionInput = {
 trainer_id:string; member_contact_id:string; starts_at:string; ends_at:string;
 session_type:string; notes?:string
}
const selection='id,tenant_id,trainer_id,member_contact_id,starts_at,ends_at,session_type,status,notes'
export async function listGymTrainingSessions(tenantId:string,from:string,to:string) {
 const {data,error}=await supabase.from('gym_training_sessions').select(selection)
  .eq('tenant_id',tenantId).gte('starts_at',from).lt('starts_at',to).order('starts_at')
 if(error) throw toBackendError(error)
 return (data??[]) as unknown as GymTrainingSession[]
}
export async function createGymTrainingSession(tenantId:string,input:GymTrainingSessionInput) {
 const start=Date.parse(input.starts_at),end=Date.parse(input.ends_at)
 if(!input.trainer_id||!input.member_contact_id) throw new BackendError('Choose a trainer and member.','validation')
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start) throw new BackendError('Enter a valid session time range.','validation')
 if(input.session_type.trim().length<2) throw new BackendError('Enter a session type.','validation')
 return run<GymTrainingSession>(supabase.from('gym_training_sessions').insert({
  tenant_id:tenantId,trainer_id:input.trainer_id,member_contact_id:input.member_contact_id,
  starts_at:input.starts_at,ends_at:input.ends_at,session_type:input.session_type.trim(),notes:input.notes?.trim()||null
 }).select(selection).single() as never)
}
export async function setGymTrainingSessionStatus(id:string,status:GymTrainingSession['status']) {
 return run(supabase.from('gym_training_sessions').update({status}).eq('id',id))
}
