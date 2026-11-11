// Proposed, hardened Edge Function. Not deployed automatically.
// Configure APP_ALLOWED_ORIGINS as a comma-separated exact-origin allowlist before deployment.
// Supabase injects SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const allowedOrigins = (Deno.env.get('APP_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const allowedRoles = new Set(['admin', 'manager', 'operator', 'accountant', 'readonly'])
const maxBodyBytes = 16 * 1024

function response(body: unknown, status = 200, origin?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  }
  if (origin && allowedOrigins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin
  return new Response(JSON.stringify(body), { status, headers })
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  if (origin && !allowedOrigins.includes(origin)) return response({ error: 'origin_not_allowed' }, 403)
  if (allowedOrigins.length === 0) return response({ error: 'invitation_service_not_configured' }, 503)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin ?? '',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '600',
        'Vary': 'Origin',
      },
    })
  }
  if (req.method !== 'POST') return response({ error: 'method_not_allowed' }, 405, origin)

  try {
    const contentLength = Number(req.headers.get('Content-Length') ?? '0')
    if (contentLength > maxBodyBytes) return response({ error: 'request_too_large' }, 413, origin)

    const authorization = req.headers.get('Authorization')
    if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
      return response({ error: 'unauthenticated' }, 401, origin)
    }

    const raw = await req.text()
    if (new TextEncoder().encode(raw).byteLength > maxBodyBytes) {
      return response({ error: 'request_too_large' }, 413, origin)
    }
    let body: unknown
    try { body = JSON.parse(raw) } catch { return response({ error: 'invalid_json' }, 400, origin) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return response({ error: 'invalid_input' }, 400, origin)
    }

    const input = body as Record<string, unknown>
    const tenantId = typeof input.tenantId === 'string' ? input.tenantId.trim() : ''
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
    const roleKey = typeof input.roleKey === 'string' ? input.roleKey.trim() : ''
    const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : ''
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)
      || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || !allowedRoles.has(roleKey)
      || (fullName && (fullName.length < 2 || fullName.length > 160))) {
      return response({ error: 'invalid_input' }, 400, origin)
    }

    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anonKey || !serviceKey) return response({ error: 'invitation_service_not_configured' }, 503, origin)

    // Validate the caller's JWT and permission using the caller-scoped client.
    const asUser = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    })
    const { data: userData, error: userError } = await asUser.auth.getUser()
    if (userError || !userData.user) return response({ error: 'unauthenticated' }, 401, origin)

    const { data: allowed, error: permissionError } = await asUser.rpc('can_manage_staff', { p_tenant: tenantId })
    if (permissionError || allowed !== true) return response({ error: 'forbidden' }, 403, origin)

    // Privileged operations happen only after the caller has passed the RLS-aware check.
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: existingMembership, error: duplicateError } = await admin
      .from('tenant_users')
      .select('id,status')
      .eq('tenant_id', tenantId)
      .ilike('email', email)
      .limit(1)
    if (duplicateError) return response({ error: 'invitation_lookup_failed' }, 500, origin)
    if (existingMembership?.length) {
      return response({ error: existingMembership[0].status === 'invited' ? 'invitation_already_pending' : 'staff_already_exists' }, 409, origin)
    }

    const { data: role, error: roleError } = await admin
      .from('roles')
      .select('id')
      .is('tenant_id', null)
      .eq('key', roleKey)
      .maybeSingle()
    if (roleError || !role) return response({ error: 'role_unavailable' }, 400, origin)

    // The database trigger reserves a seat for both active staff and pending invitations.
    // It serialises concurrent inserts under the organisation row lock.
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: fullName ? { full_name: fullName } : {},
    })
    if (inviteError || !invited.user) {
      return response({ error: 'invite_delivery_failed_or_account_exists' }, 409, origin)
    }

    const { error: membershipError } = await admin.from('tenant_users').insert({
      tenant_id: tenantId,
      user_id: invited.user.id,
      role_id: role.id,
      email,
      full_name: fullName || null,
      status: 'invited',
      invited_by: userData.user.id,
    })
    if (membershipError) {
      // Do not return raw database/provider errors. Auth invitation may already have been
      // issued; operator can reconcile the account safely without exposing internal details.
      const seatLimit = /staff seat limit reached|eligible subscription/i.test(membershipError.message)
      return response({ error: seatLimit ? 'staff_seat_limit_reached' : 'invitation_membership_save_failed' }, seatLimit ? 409 : 500, origin)
    }

    return response({ ok: true, status: 'invited' }, 201, origin)
  } catch {
    return response({ error: 'unexpected_invitation_error' }, 500, origin)
  }
})
