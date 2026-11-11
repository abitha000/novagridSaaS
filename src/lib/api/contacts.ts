import { supabase } from '../supabase'
import { BackendError, run, toBackendError } from './errors'
import type { Channel, Contact } from './types'

const E164 = /^\+[1-9]\d{7,14}$/
const clean = (s: string) => s.replace(/[,()%*\\:]/g, ' ').trim()

export async function listContacts(tenantId: string, opts: { search?: string; page?: number; pageSize?: number } = {}) {
  const { search = '', page = 0, pageSize = 25 } = opts
  let q = supabase.from('contacts')
    .select('id,tenant_id,type,full_name,phone_e164,email,attributes,status,created_at,communication_preferences(channel,consent_status)', { count: 'exact' })
    .eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)
  const s = clean(search)
  if (s) q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone_e164.ilike.%${s}%`)
  const { data, error, count } = await q
  if (error) throw toBackendError(error)
  return { rows: (data ?? []) as unknown as Contact[], total: count ?? 0 }
}

export type ContactInput = { type: string; full_name: string; phone_e164?: string; email?: string; attributes?: Record<string, unknown> }
function validate(i: ContactInput) {
  if (i.full_name.trim().length < 2) throw new BackendError('Name must be at least 2 characters.', 'validation')
  if (i.phone_e164 && !E164.test(i.phone_e164)) throw new BackendError('Phone must be international format, e.g. +919876543210.', 'validation')
  if (i.email && !/^\S+@\S+\.\S+$/.test(i.email)) throw new BackendError('Enter a valid email address.', 'validation')
}
const toInsertRow = (i: ContactInput, tenantId: string) => {
  validate(i)
  return { tenant_id: tenantId, type: i.type.trim() || 'person', full_name: i.full_name.trim(), phone_e164: i.phone_e164 || null, email: i.email?.trim() || null, attributes: i.attributes ?? {} }
}

export async function createContact(tenantId: string, i: ContactInput) {
  return run<Contact>(supabase.from('contacts').insert(toInsertRow(i, tenantId)).select().single())
}

/** Insert in bounded batches. Tenant ownership is always supplied by the authenticated workspace context. */
export async function createContacts(tenantId: string, items: ContactInput[]) {
  if (!items.length) return 0
  let inserted = 0
  for (let offset = 0; offset < items.length; offset += 100) {
    const batch = items.slice(offset, offset + 100).map((item) => toInsertRow(item, tenantId))
    const { data, error } = await supabase.from('contacts').insert(batch).select('id')
    if (error) throw toBackendError(error)
    inserted += data?.length ?? batch.length
  }
  return inserted
}

/** Export all active contacts while preserving the caller's RLS scope. */
export async function listAllContacts(tenantId: string) {
  const rows: Contact[] = []
  for (let page = 0; ; page += 1) {
    const result = await listContacts(tenantId, { page, pageSize: 500 })
    rows.push(...result.rows)
    if (rows.length >= result.total || result.rows.length === 0) break
  }
  return rows
}

export async function updateContact(id: string, patch: Partial<ContactInput>) {
  if (patch.full_name !== undefined) validate({ type: 'x', ...patch, full_name: patch.full_name })
  return run<Contact>(supabase.from('contacts').update(patch).eq('id', id).select().single())
}
export const archiveContact = (id: string) => run(supabase.from('contacts').update({ deleted_at: new Date().toISOString() }).eq('id', id))
export const recordConsent = (tenantId: string, contactId: string, channel: Channel, status: 'opted_in' | 'opted_out', source: string) =>
  run(supabase.rpc('record_consent', { p_tenant: tenantId, p_contact: contactId, p_channel: channel, p_status: status, p_source: source }))
