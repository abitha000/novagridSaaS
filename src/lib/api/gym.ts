import { supabase } from '../supabase'
import { BackendError, run, toBackendError } from './errors'

export type GymMembership = {
  id: string
  tenant_id: string
  contact_id: string
  plan_name: string
  start_date: string
  end_date: string
  amount_paise: number
  status: 'active' | 'paused' | 'cancelled'
  notes: string | null
  created_at: string
  contact?: { full_name: string; phone_e164: string | null; email: string | null } | null
}
export type GymMembershipInput = {
  contact_id: string
  plan_name: string
  start_date: string
  end_date: string
  amount_paise: number
  notes?: string
}
export async function listGymMemberships(tenantId: string) {
  const { data, error } = await supabase.from('gym_memberships')
    .select('id,tenant_id,contact_id,plan_name,start_date,end_date,amount_paise,status,notes,created_at,contact:contacts(full_name,phone_e164,email)')
    .eq('tenant_id', tenantId).order('end_date', { ascending: true }).limit(1000)
  if (error) throw toBackendError(error)
  return (data ?? []) as unknown as GymMembership[]
}
export async function createGymMembership(tenantId: string, input: GymMembershipInput) {
  if (!input.contact_id) throw new BackendError('Choose a member.', 'validation')
  if (input.plan_name.trim().length < 2) throw new BackendError('Enter a plan name.', 'validation')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(input.end_date) || input.end_date < input.start_date)
    throw new BackendError('Enter a valid membership date range.', 'validation')
  if (!Number.isSafeInteger(input.amount_paise) || input.amount_paise < 0) throw new BackendError('Enter a valid membership amount.', 'validation')
  return run<GymMembership>(supabase.from('gym_memberships').insert({
    tenant_id: tenantId, contact_id: input.contact_id, plan_name: input.plan_name.trim(),
    start_date: input.start_date, end_date: input.end_date, amount_paise: input.amount_paise,
    notes: input.notes?.trim() || null, status: 'active',
  }).select('id,tenant_id,contact_id,plan_name,start_date,end_date,amount_paise,status,notes,created_at,contact:contacts(full_name,phone_e164,email)').single() as never)
}
export async function setGymMembershipStatus(id: string, status: GymMembership['status']) {
  return run(supabase.from('gym_memberships').update({ status }).eq('id', id))
}
