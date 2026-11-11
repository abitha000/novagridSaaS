import { supabase } from '../supabase'
import { run, toBackendError } from './errors'

export type PaymentRecord = {
  id: string
  tenant_id: string
  contact_id: string
  amount_paise: number
  currency: 'INR'
  method: 'cash' | 'upi' | 'bank_transfer' | 'card' | 'cheque' | 'other'
  status: 'received' | 'refunded' | 'void'
  source: 'manual'
  reference: string | null
  notes: string | null
  paid_at: string
  created_at: string
  contact?: { full_name: string } | null
}
export type PaymentInput = {
  contact_id: string
  amount_paise: number
  method: PaymentRecord['method']
  paid_at: string
  reference?: string
  notes?: string
}

export async function listPayments(tenantId: string) {
  const { data, error } = await supabase.from('payment_records')
    .select('id,tenant_id,contact_id,amount_paise,currency,method,status,source,reference,notes,paid_at,created_at,contact:contacts(full_name)')
    .eq('tenant_id', tenantId).order('paid_at', { ascending: false }).limit(500)
  if (error) throw toBackendError(error)
  return (data ?? []) as unknown as PaymentRecord[]
}
export async function createPayment(tenantId: string, input: PaymentInput) {
  if (!input.contact_id) throw new Error('Choose a customer.')
  if (!Number.isSafeInteger(input.amount_paise) || input.amount_paise <= 0) throw new Error('Enter a valid amount.')
  return run<PaymentRecord>(supabase.from('payment_records').insert({
    tenant_id: tenantId, ...input, reference: input.reference?.trim() || null,
    notes: input.notes?.trim() || null, source: 'manual', status: 'received',
  }).select().single())
}
