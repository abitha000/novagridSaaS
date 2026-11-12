import {supabase} from '../supabase'
import {run,toBackendError} from './errors'
export type EduVehicle={id:string;tenant_id:string;registration_number:string;vehicle_type:'bus'|'van'|'car';capacity:number;driver_name:string;driver_phone:string|null;is_active:boolean}
export type EduRoute={id:string;tenant_id:string;name:string;direction:'pickup'|'drop'|'both';vehicle_id:string|null;is_active:boolean;vehicle?:Pick<EduVehicle,'registration_number'|'capacity'>|null}
export type EduStop={id:string;tenant_id:string;route_id:string;name:string;sequence:number;pickup_time:string|null;drop_time:string|null;fee_paise:number}
export type EduTransportAllocation={id:string;tenant_id:string;route_id:string;stop_id:string;enrolment_id:string;start_date:string;end_date:string|null;status:'active'|'ended';enrolment?:{student?:{full_name:string}|null}|null;route?:{name:string}|null;stop?:{name:string}|null}
export async function listEduTransport(tenantId:string){
 const [v,r,s,a]=await Promise.all([
  supabase.from('edu_vehicles').select('*').eq('tenant_id',tenantId).order('registration_number'),
  supabase.from('edu_routes').select('*,vehicle:edu_vehicles(registration_number,capacity)').eq('tenant_id',tenantId).order('name'),
  supabase.from('edu_route_stops').select('*').eq('tenant_id',tenantId).order('sequence'),
  supabase.from('edu_transport_allocations').select('*,enrolment:edu_enrolments(student:contacts!edu_enrolments_student_contact_id_fkey(full_name)),route:edu_routes(name),stop:edu_route_stops(name)').eq('tenant_id',tenantId).eq('status','active')
 ]);
 for(const x of [v,r,s,a])if(x.error)throw toBackendError(x.error);
 return {vehicles:(v.data??[]) as EduVehicle[],routes:(r.data??[]) as EduRoute[],stops:(s.data??[]) as EduStop[],allocations:(a.data??[]) as unknown as EduTransportAllocation[]}
}
export async function saveEduVehicle(tenantId:string,input:Pick<EduVehicle,'registration_number'|'vehicle_type'|'capacity'|'driver_name'|'driver_phone'>){return run(supabase.from('edu_vehicles').insert({tenant_id:tenantId,...input}).select().single())}
export async function saveEduRoute(tenantId:string,input:Pick<EduRoute,'name'|'direction'|'vehicle_id'>){return run(supabase.from('edu_routes').insert({tenant_id:tenantId,...input}).select().single())}
export async function saveEduStop(tenantId:string,input:Pick<EduStop,'route_id'|'name'|'sequence'|'pickup_time'|'drop_time'|'fee_paise'>){return run(supabase.from('edu_route_stops').insert({tenant_id:tenantId,...input}).select().single())}
export async function allocateEduTransport(tenantId:string,input:Pick<EduTransportAllocation,'route_id'|'stop_id'|'enrolment_id'>){return run(supabase.from('edu_transport_allocations').insert({tenant_id:tenantId,...input}).select().single())}
