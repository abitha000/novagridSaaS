import { supabase } from '../supabase'
import { BackendError, run, toBackendError } from './errors'

export type TrainerAvailability = { id:string; tenant_id:string; trainer_id:string; weekday:number; starts_at:string; ends_at:string }
export type TrainerTimeOff = { id:string; tenant_id:string; trainer_id:string; starts_at:string; ends_at:string; reason:string|null }
export async function listTrainerAvailability(tenantId:string) {
 const {data,error}=await supabase.from('gym_trainer_availability').select('id,tenant_id,trainer_id,weekday,starts_at,ends_at').eq('tenant_id',tenantId).order('weekday').order('starts_at')
 if(error) throw toBackendError(error)
 return (data??[]) as TrainerAvailability[]
}
export async function saveTrainerAvailability(tenantId:string,trainerId:string,slots:{weekday:number;starts_at:string;ends_at:string}[]) {
 if(!trainerId) throw new BackendError('Choose a trainer.','validation')
 if(slots.some(s=>s.weekday<0||s.weekday>6||s.ends_at<=s.starts_at)) throw new BackendError('Check the working days and time ranges.','validation')
 const {error:delError}=await supabase.from('gym_trainer_availability').delete().eq('tenant_id',tenantId).eq('trainer_id',trainerId)
 if(delError) throw toBackendError(delError)
 if(!slots.length) return
 const {error}=await supabase.from('gym_trainer_availability').insert(slots.map(s=>({...s,tenant_id:tenantId,trainer_id:trainerId})))
 if(error) throw toBackendError(error)
}
export async function listTrainerTimeOff(tenantId:string,from:string,to:string) {
 const {data,error}=await supabase.from('gym_trainer_time_off').select('id,tenant_id,trainer_id,starts_at,ends_at,reason').eq('tenant_id',tenantId).lt('starts_at',to).gt('ends_at',from).order('starts_at')
 if(error) throw toBackendError(error)
 return (data??[]) as TrainerTimeOff[]
}
export async function createTrainerTimeOff(tenantId:string,input:{trainer_id:string;starts_at:string;ends_at:string;reason?:string}) {
 if(!input.trainer_id||Date.parse(input.ends_at)<=Date.parse(input.starts_at)) throw new BackendError('Choose a trainer and valid leave period.','validation')
 return run<TrainerTimeOff>(supabase.from('gym_trainer_time_off').insert({tenant_id:tenantId,...input}).select('id,tenant_id,trainer_id,starts_at,ends_at,reason').single() as never)
}
export async function deleteTrainerTimeOff(id:string) {
 const {error}=await supabase.from('gym_trainer_time_off').delete().eq('id',id)
 if(error) throw toBackendError(error)
}
