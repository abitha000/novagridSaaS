// PROPOSED Edge Function - not deployed. Deploy only after approval:  supabase functions deploy invite-staff
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are injected by Supabase into Edge Functions.
// The service-role key therefore never exists in the repository, the browser bundle or .env files.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Content-Type': 'application/json' }
// TODO before production: restrict the origin to your app domain.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors })
  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ error: 'unauthenticated' }, 401)
    const { tenantId, email, roleKey, fullName } = await req.json()
    if (!/^[0-9a-f-]{36}$/.test(tenantId ?? '') || !/^\S+@\S+\.\S+$/.test(email ?? '') || !['admin', 'manager', 'operator', 'accountant', 'readonly'].includes(roleKey)) {
      return json({ error: 'invalid input' }, 400)
    }

    // 1. Authorise AS THE CALLER (their JWT). RLS-aware function decides.
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: me } = await asUser.auth.getUser()
    if (!me.user) return json({ error: 'unauthenticated' }, 401)
    const { data: allowed, error: aerr } = await asUser.rpc('can_manage_staff', { p_tenant: tenantId })
    if (aerr || allowed !== true) return json({ error: 'forbidden' }, 403)

    // 2. Privileged work (service role) only after the check above.
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    // TODO (migration 0009 usage/quotas): enforce the plan's staff-seat limit here.
    const { data: role } = await admin.from('roles').select('id').is('tenant_id', null).eq('key', roleKey).single()
    if (!role) return json({ error: 'unknown role' }, 400)
    const { data: invited, error: ierr } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName ?? null } })
    if (ierr || !invited.user) return json({ error: ierr?.message ?? 'invite failed' }, 400)
    const { error: terr } = await admin.from('tenant_users').insert({ tenant_id: tenantId, user_id: invited.user.id, role_id: role.id, email, full_name: fullName ?? null, status: 'invited', invited_by: me.user.id })
    if (terr) return json({ error: terr.message }, 400)
    return json({ ok: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unexpected' }, 500)
  }
})
