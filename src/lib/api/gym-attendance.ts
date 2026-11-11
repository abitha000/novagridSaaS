import { supabase } from '../supabase'
import { run, toBackendError } from './errors'

export type GymAttendanceStatus = 'present' | 'late' | 'absent'
export type GymAttendance = {
  id: string
  tenant_id: string
  contact_id: string
  attendance_date: string
  status: GymAttendanceStatus
  marked_at: string
}
export async function listGymAttendance(tenantId: string, date: string) {
  const { data, error } = await supabase.from('gym_attendance')
    .select('id,tenant_id,contact_id,attendance_date,status,marked_at')
    .eq('tenant_id', tenantId).eq('attendance_date', date)
  if (error) throw toBackendError(error)
  return (data ?? []) as GymAttendance[]
}
export async function saveGymAttendance(tenantId: string, date: string, marks: { contact_id: string; status: GymAttendanceStatus }[]) {
  if (!marks.length) return []
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) throw toBackendError(authError ?? { message: 'Please sign in again.', code: '28000' })
  return run(supabase.from('gym_attendance').upsert(
    marks.map(mark => ({ tenant_id: tenantId, attendance_date: date, contact_id: mark.contact_id, status: mark.status, marked_by: authData.user.id })),
    { onConflict: 'tenant_id,contact_id,attendance_date' }
  ).select('id,tenant_id,contact_id,attendance_date,status,marked_at') as never)
}
