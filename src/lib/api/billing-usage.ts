import {supabase} from '../supabase'
import {toBackendError} from './errors'
export type TenantUsage={staff:number;people:number;messages:number;storageBytes:number}
export async function getTenantUsage(tenantId:string):Promise<TenantUsage>{
 const now=new Date(),start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString()
 const [staff,people,messages,files]=await Promise.all([
  supabase.from('tenant_users').select('id',{count:'exact',head:true}).eq('tenant_id',tenantId).eq('status','active'),
  supabase.from('contacts').select('id',{count:'exact',head:true}).eq('tenant_id',tenantId).is('deleted_at',null).eq('status','active'),
  supabase.from('notification_recipients').select('id',{count:'exact',head:true}).eq('tenant_id',tenantId).gte('created_at',start).neq('status','skipped'),
  supabase.from('objects').select('metadata').eq('bucket_id','novagrid-files').like('name',tenantId+'/%')
 ])
 for(const q of [staff,people,messages,files])if(q.error)throw toBackendError(q.error)
 const storageBytes=(files.data??[]).reduce((sum,row)=>{const size=Number((row.metadata as {size?:unknown}|null)?.size);return sum+(Number.isFinite(size)&&size>0?size:0)},0)
 return {staff:staff.count??0,people:people.count??0,messages:messages.count??0,storageBytes}
}
