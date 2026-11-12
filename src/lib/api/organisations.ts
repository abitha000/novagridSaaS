import { supabase } from '../supabase'
import { BackendError, run } from './errors'
import type { RegistrationInput, Workspace } from './types'

/** Active industry categories. Readable before sign-in (registration form). */
export const listCategories = () =>
  run(supabase.from('industry_categories').select('id,key,name').eq('active', true).order('name'))

/** Memberships of the signed-in user, RLS-scoped. */
export const listMyWorkspaces = () =>
  run<Workspace[]>(
    supabase
      .from('tenant_users')
      .select('tenant_id, role:roles(key,name), organisation:organisations(id,name,approval_status,lifecycle_status,industry:industry_categories(key,name))')
      .eq('status', 'active') as never,
  )

/** Own platform role, or null for ordinary users. */
export async function getPlatformRole(): Promise<'super_admin' | 'support' | null> {
  const row = await run<{ role: 'super_admin' | 'support' } | null>(supabase.from('platform_users').select('role').eq('status', 'active').maybeSingle())
  return row?.role ?? null
}

/** Creates the organisation, owner membership, settings and pending approval atomically (server-side RPC). */
export async function registerOrganisation(token: string, i: RegistrationInput): Promise<string> {
  if (!/^\+[1-9]\d{7,14}$/.test(i.phone.replace(/[\s-]/g, ''))) throw new BackendError('Enter the phone number in international format, e.g. +919876543210.', 'validation')
  return run<string>(
    supabase.rpc('register_organisation', {
      p_registration_token: token,
      p_name: i.name.trim(),
      p_owner_name: i.ownerName.trim(),
      p_phone: i.phone.replace(/[\s-]/g, ''),
      p_address: i.address.trim(),
      p_country: i.country,
      p_state: i.state.trim(),
      p_city: i.city.trim(),
      p_category_key: i.categoryKey,
      p_org_type: i.orgType.trim(),
      p_plan_key: i.planKey,
    }),
  )
}

/* ---- Platform administrator operations (all enforced server-side; the UI is not the gate) ---- */
export type AdminOrganisation = {
  id: string
  name: string
  approval_status: 'pending' | 'approved' | 'rejected'
  lifecycle_status: string
  city: string | null
  created_at: string
  industry: { key: string; name: string } | null
}

/** Normalise PostgREST's one-to-one relationship result so callers always receive an object or null. */
export const listOrganisationsAdmin = async (): Promise<AdminOrganisation[]> => {
  const rows = await run<Array<Omit<AdminOrganisation, 'industry'> & { industry: AdminOrganisation['industry'] | AdminOrganisation['industry'][] }>>(
    supabase.from('organisations').select('id,name,approval_status,lifecycle_status,city,created_at,industry:industry_categories(key,name)').order('created_at', { ascending: false }) as never,
  )
  return rows.map((row) => ({ ...row, industry: Array.isArray(row.industry) ? row.industry[0] ?? null : row.industry }))
}

export const decideApproval = (org: string, decision: 'approved' | 'rejected', reason?: string, categoryKey?: string) =>
  run(supabase.rpc('decide_organisation_approval', { p_org: org, p_decision: decision, p_reason: reason ?? null, p_category_key: categoryKey ?? null }))

export const setSuspension = (org: string, suspend: boolean, reason?: string) =>
  run(supabase.rpc('set_organisation_suspension', { p_org: org, p_suspend: suspend, p_reason: reason ?? null }))

export const assignSubscription = (org: string, planKey: string, status: 'trial' | 'active', periodEnd: string) =>
  run(supabase.rpc('assign_subscription', { p_org: org, p_plan_key: planKey, p_status: status, p_period_end: periodEnd }))


export type SubscriptionAdminRow = {
  id: string
  status: 'trial' | 'active' | 'grace' | 'read_only' | 'suspended' | 'cancelled' | 'expired'
  period_start: string
  period_end: string
  organisation: { id: string; name: string; approval_status: string; lifecycle_status: string; industry: { key: string; name: string } | null }
  plan: { key: string; name: string; price_inr_monthly: number; price_inr_yearly: number } | null
}

/** Platform-only subscription list. RLS and platform role checks remain authoritative. */
export const listSubscriptionsAdmin = () =>
  run<SubscriptionAdminRow[]>(
    supabase.from('subscriptions')
      .select('id,status,period_start,period_end,organisation:organisations(id,name,approval_status,lifecycle_status,industry:industry_categories(key,name)),plan:subscription_plans(key,name,price_inr_monthly,price_inr_yearly)')
      .order('created_at', { ascending: false }) as never,
  )


export type OrganisationSubscription = {
  id: string
  status: SubscriptionAdminRow['status']
  period_start: string
  period_end: string
  plan: { key: string; name: string; price_inr_monthly: number; price_inr_yearly: number; limits: Record<string, number> } | null
}
export type IndustryPlan = {
  key: string
  name: string
  price_inr_monthly: number
  price_inr_yearly: number
  limits: Record<string, number>
}

/** Current tenant subscription, constrained by tenant RLS. */
export const getMySubscription = (tenantId: string) =>
  run<OrganisationSubscription | null>(
    supabase.from('subscriptions')
      .select('id,status,period_start,period_end,plan:subscription_plans(key,name,price_inr_monthly,price_inr_yearly,limits)')
      .eq('organisation_id', tenantId)
      .in('status', ['trial','active','grace','read_only'])
      .maybeSingle() as never,
  )

/** Active plans scoped to the approved industry category. */
export async function listIndustryPlans(industryKey: string): Promise<IndustryPlan[]> {
  const categories = await listCategories()
  const category = categories.find((item: { key: string }) => item.key === industryKey)
  if (!category) return []
  return run<IndustryPlan[]>(
    supabase.from('subscription_plans')
      .select('key,name,price_inr_monthly,price_inr_yearly,limits')
      .eq('active', true)
      .eq('industry_category_id', category.id)
      .order('price_inr_monthly'),
  )
}
