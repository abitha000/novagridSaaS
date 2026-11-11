import { supabase } from '../supabase'
import { BackendError, run, toBackendError } from './errors'

export type GymTrainer = {
 id:string; tenant_id:string; contact_id:string; specialty:string; bio:string|null;
 status:'active'|'inactive'; created_at:string;
 contact?:{full_name:string;phone_e164:string|null;email:string|null}|null
}
export async function listGymTrainers(tenantId:string) {
 const {data,error}=await supabase.from('gym_trainers')
  .select('id,tenant_id,contact_id,specialty,bio,status,created_at,contact:contacts(full_name,phone_e164,email)')
  .eq('tenant_id',tenantId).order('created_at',{ascending:false})
 if(error) throw toBackendError(error)
 return (data??[]) as unknown as GymTrainer[]
}
export async function createGymTrainer(tenantId:string,input:{contact_id:string;specialty:string;bio?:string}) {
 if(!input.contact_id) throw new BackendError('Choose a staff contact.','validation')
 if(input.specialty.trim().length<2) throw new BackendError('Enter a trainer speciality.','validation')
 return run<GymTrainer>(supabase.from('gym_trainers').insert({
  tenant_id:tenantId,contact_id:input.contact_id,specialty:input.specialty.trim(),bio:input.bio?.trim()||null
 }).select('id,tenant_id,contact_id,specialty,bio,status,created_at,contact:contacts(full_name,phone_e164,email)').single() as never)
}
export async function setGymTrainerStatus(id:string,status:GymTrainer['status']) {
 return run(supabase.from('gym_trainers').update({status}).eq('id',id))
}
