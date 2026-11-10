import { supabase } from '../supabase'
import { BackendError, run } from './errors'
import type { StaffMember } from './types'

export const listStaff = (tenantId: string) =>
  run<StaffMember[]>(
    supabase.from('tenant_users').select('id,tenant_id,user_id,full_name,email,status,created_at,role:roles(id,key,name)').eq('tenant_id', tenantId).order('created_at') as never,
  )

export const listAssignableRoles = () =>
  run<{ id: string; key: string; name: string }[]>(supabase.from('roles').select('id,key,name').is('tenant_id', null).neq('key', 'owner').order('name') as never)

export const changeStaffRole = (staffId: string, roleId: string) => run(supabase.from('tenant_users').update({ role_id: roleId }).eq('id', staffId))

/** Staff are disabled, never deleted, to preserve audit history. */
export const setStaffStatus = (staffId: string, status: 'active' | 'disabled') => run(supabase.from('tenant_users').update({ status }).eq('id', staffId))

/**
 * Invitations need the auth admin API, so they run in the `invite-staff` Edge Function
 * (supabase/proposed-functions/invite-staff). The service-role key exists only there.
 */
export async function inviteStaff(tenantId: string, email: string, roleKey: string, fullName?: string) {
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new BackendError('Enter a valid email address.', 'validation')
  const { data, error } = await supabase.functions.invoke('invite-staff', { body: { tenantId, email, roleKey, fullName } })
  if (error) throw new BackendError(error.message.includes('404') ? 'The invite-staff Edge Function is not deployed yet.' : error.message, 'unknown')
  return data as { ok: true }
}
