import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { REQUIRED_SCHEMA_VERSION, supabase } from './supabase'
import { getPlatformRole, listMyWorkspaces, registerOrganisation } from './api/organisations'
import type { RegistrationInput, Workspace } from './api/types'

/**
 * backend:
 *  checking - probing the database (read-only RPC)
 *  live     - NOVAGRID schema at the required version detected; real auth and data are used
 *  demo     - schema missing or outdated; the prototype keeps working on sample data and says so
 */
type Backend = 'checking' | 'live' | 'demo'
type PendingRegistration = { token: string; input: RegistrationInput }

type Ctx = {
  backend: Backend
  backendNote: string
  registrationError: string | null
  session: Session | null
  user: User | null
  ready: boolean
  workspaces: Workspace[]
  platformRole: 'super_admin' | 'support' | null
  activeTenantId: string | null
  setActiveTenantId: (id: string) => void
  homePath: () => string
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, reg: PendingRegistration) => Promise<{ needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthCtx = createContext<Ctx | null>(null)
export const useAuth = () => {
  const c = useContext(AuthCtx)
  if (!c) throw new Error('useAuth outside AuthProvider')
  return c
}
/** Tenant id when running against the live backend with a selected organisation; otherwise null (demo data). */
export const useLiveTenant = () => {
  const a = useAuth()
  return a.backend === 'live' ? a.activeTenantId : null
}

const TENANT_KEY = 'ng_active_tenant'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<Backend>('checking')
  const [backendNote, setNote] = useState('')
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [platformRole, setPlatformRole] = useState<Ctx['platformRole']>(null)
  const [activeTenantId, setActive] = useState<string | null>(() => localStorage.getItem(TENANT_KEY))
  const completing = useRef(false)

  // 1. Read-only probe: does the approved schema exist?
  useEffect(() => {
    supabase.rpc('novagrid_schema_version').then(({ data, error }) => {
      if (error) {
        setBackend('demo')
        setNote(error.code === 'PGRST202' || error.code === '42883' ? 'NOVAGRID database schema is not installed. Running on sample data.' : `Backend unreachable (${error.message}). Running on sample data.`)
      } else if (typeof data === 'number' && data >= REQUIRED_SCHEMA_VERSION) {
        setBackend('live')
      } else {
        setBackend('demo')
        setNote(`Database schema version ${data ?? 'unknown'} is older than required (${REQUIRED_SCHEMA_VERSION}). Running on sample data.`)
      }
    })
  }, [])

  // 2. Session tracking
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const load = useCallback(async () => {
    if (backend !== 'live') return
    if (!session) {
      setWorkspaces([])
      setPlatformRole(null)
      setReady(true)
      return
    }
    try {
      // Complete email-confirmed registrations. The registration token makes retries safe.
      const pending = session.user.user_metadata?.pending_registration as PendingRegistration | undefined
      if (pending && session.user.email_confirmed_at && !completing.current) {
        completing.current = true
        try {
          await registerOrganisation(pending.token, pending.input)
          const { error } = await supabase.auth.updateUser({ data: { pending_registration: null } })
          if (error) throw error
          setRegistrationError(null)
        } catch (e) {
          setRegistrationError(e instanceof Error ? e.message : 'Organisation setup could not be completed. Please retry.')
        } finally {
          completing.current = false
        }
      }
      const [ws, pr] = await Promise.all([listMyWorkspaces(), getPlatformRole()])
      setWorkspaces(ws)
      setPlatformRole(pr)
      setActive((cur) => (ws.some((w) => w.tenant_id === cur) ? cur : ws[0]?.tenant_id ?? null))
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not load your workspaces')
    } finally {
      setReady(true)
    }
  }, [backend, session])

  useEffect(() => {
    if (backend === 'checking') return
    if (backend === 'demo') return setReady(true)
    setReady(false)
    load()
  }, [backend, load])

  const value = useMemo<Ctx>(
    () => ({
      backend,
      backendNote,
      registrationError,
      session,
      user: session?.user ?? null,
      ready: backend !== 'checking' && ready,
      workspaces,
      platformRole,
      activeTenantId,
      setActiveTenantId: (id) => {
        localStorage.setItem(TENANT_KEY, id)
        setActive(id)
      },
      homePath: () => {
        if (platformRole) return '/platform/overview'
        const w = workspaces.find((x) => x.tenant_id === activeTenantId) ?? workspaces[0]
        return `/app/${w?.organisation?.industry?.key ?? 'education'}/overview`
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message)
      },
      signUp: async (email, password, reg) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${(import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '')}/?auth_callback=signup`, data: { full_name: reg.input.ownerName, pending_registration: reg } },
        })
        if (error) throw new Error(error.message)
        return { needsEmailConfirmation: !data.session }
      },
      signOut: async () => {
        await supabase.auth.signOut()
        setWorkspaces([])
        setPlatformRole(null)
      },
      refresh: load,
    }),
    [backend, backendNote, registrationError, session, ready, workspaces, platformRole, activeTenantId, load],
  )
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
