import {supabase} from '../supabase'
import {toBackendError} from './errors'
export type TenantUsage={staff:number;people:number;messages:number;storageBytes:number}
export async function getTenantUsage(tenantId:string):Promise<TenantUsage>{
 const now=new Date(),start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString()
 const [staff,people,messages]=await Promise.all([
  supabase.from('tenant_users').select('id',{count:'exact',head:true}).eq('tenant_id',tenantId).eq('status','active'),
  supabase.from('contacts').select('id',{count:'exact',head:true}).eq('tenant_id',tenantId).is('deleted_at',null).eq('status','active'),
  supabase.from('notification_recipients').select('id',{count:'exact',head:true}).eq('tenant_id',tenantId).gte('created_at',start).neq('status','skipped')
 ])
 for(const q of [staff,people,messages])if(q.error)throw toBackendError(q.error)
 const bucket=supabase.storage.from('novagrid-files')
 const folderBytes=async(path:string):Promise<number>=>{let total=0,offset=0;for(;;){const {data,error}=await bucket.list(path,{limit:1000,offset});if(error)throw toBackendError(error);const rows=data??[];for(const row of rows){if(row.id&&row.metadata){const size=Number((row.metadata as {size?:unknown}).size);if(Number.isFinite(size)&&size>0)total+=size}else if(!row.id){total+=await folderBytes(path+'/'+row.name)}}if(rows.length<1000)break;offset+=rows.length}return total}
 const storageBytes=await folderBytes(tenantId)
 return {staff:staff.count??0,people:people.count??0,messages:messages.count??0,storageBytes}
}
