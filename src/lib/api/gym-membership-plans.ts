import { supabase } from '../supabase'
import { BackendError, run, toBackendError } from './errors'

export type GymMembershipPlan={id:string;tenant_id:string;name:string;duration_days:number;price_paise:number;description:string|null;is_active:boolean;created_at:string}
export async function listGymMembershipPlans(tenantId:string,activeOnly=false){
 let q=supabase.from('gym_membership_plans').select('id,tenant_id,name,duration_days,price_paise,description,is_active,created_at').eq('tenant_id',tenantId).order('name')
 if(activeOnly) q=q.eq('is_active',true)
 const {data,error}=await q
 if(error) throw toBackendError(error)
 return (data??[]) as GymMembershipPlan[]
}
export async function saveGymMembershipPlan(tenantId:string,input:{id?:string;name:string;duration_days:number;price_paise:number;description?:string}){
 if(input.name.trim().length<2) throw new BackendError('Enter a plan name.','validation')
 if(!Number.isInteger(input.duration_days)||input.duration_days<1||input.duration_days>1095) throw new BackendError('Plan duration must be 1–1095 days.','validation')
 if(!Number.isSafeInteger(input.price_paise)||input.price_paise<0) throw new BackendError('Enter a valid plan price.','validation')
 const values={name:input.name.trim(),duration_days:input.duration_days,price_paise:input.price_paise,description:input.description?.trim()||null}
 if(input.id) return run<GymMembershipPlan>(supabase.from('gym_membership_plans').update(values).eq('id',input.id).eq('tenant_id',tenantId).select('id,tenant_id,name,duration_days,price_paise,description,is_active,created_at').single() as never)
 return run<GymMembershipPlan>(supabase.from('gym_membership_plans').insert({...values,tenant_id:tenantId}).select('id,tenant_id,name,duration_days,price_paise,description,is_active,created_at').single() as never)
}
export async function setGymMembershipPlanActive(tenantId:string,id:string,is_active:boolean){
 return run(supabase.from('gym_membership_plans').update({is_active}).eq('tenant_id',tenantId).eq('id',id))
}
