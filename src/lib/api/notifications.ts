import { supabase } from '../supabase'
import { BackendError, run } from './errors'
import type { Channel, NotificationRow, RecipientRow, Template } from './types'

/**
 * Persistence only. Nothing here sends a message. Rows start as `queued`; delivery statuses are written
 * exclusively by provider webhooks and the dispatch worker (service role, Phase 7). The browser cannot
 * set a recipient to sent/delivered/read.
 */
export const listTemplates = (tenantId: string) => run<Template[]>(supabase.from('notification_templates').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }) as never)

export const createTemplate = (tenantId: string, t: { channel: Channel; name: string; body: string; dlt_template_id?: string }) => {
  if (t.name.trim().length < 2 || t.body.trim().length < 5) throw new BackendError('Template name and body are required.', 'validation')
  return run<Template>(supabase.from('notification_templates').insert({ tenant_id: tenantId, channel: t.channel, name: t.name.trim(), body: t.body, dlt_template_id: t.dlt_template_id ?? null, provider_status: 'draft' }).select().single() as never)
}

export const updateDraftTemplate = (tenantId: string, id: string, t: { channel: Channel; name: string; body: string; dlt_template_id?: string }) => {
  if (t.name.trim().length < 2 || t.body.trim().length < 5) throw new BackendError('Template name and body are required.', 'validation')
  return run<Template>(supabase.from('notification_templates').update({ channel: t.channel, name: t.name.trim(), body: t.body, dlt_template_id: t.dlt_template_id ?? null }).eq('tenant_id', tenantId).eq('id', id).eq('provider_status', 'draft').select().single() as never)
}

export const listNotifications = (tenantId: string) =>
  run<NotificationRow[]>(supabase.from('notifications').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50) as never)

export const listRecipients = (notificationId: string) =>
  run<RecipientRow[]>(supabase.from('notification_recipients').select('id,notification_id,contact_id,channel,status,skip_reason,attempts,error_code,is_permanent,updated_at,contact:contacts(full_name)').eq('notification_id', notificationId).order('updated_at', { ascending: false }).limit(500) as never)

export type AudienceDefinition = { type: 'all' } | { type: 'contacts'; contact_ids: string[] }

/** Audience resolution, consent filtering and idempotency keys all happen server-side in this RPC. */
export const createNotification = (a: { tenantId: string; title: string; channel: Channel; fallback?: Channel | null; templateId?: string | null; body: string; audience: AudienceDefinition; scheduledAt?: string | null }) => {
  if (a.body.trim().length < 5) throw new BackendError('Message body is too short.', 'validation')
  return run<string>(
    supabase.rpc('create_notification', { p_tenant: a.tenantId, p_title: a.title, p_channel: a.channel, p_fallback_channel: a.fallback ?? null, p_template_id: a.templateId ?? null, p_body: a.body, p_audience: a.audience, p_scheduled_at: a.scheduledAt ?? null }),
  )
}

export const retryRecipient = (recipientId: string) => run(supabase.rpc('retry_notification_recipient', { p_recipient: recipientId }))
