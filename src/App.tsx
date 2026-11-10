import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { go, useRoute } from './lib/router'
import { Button, EmptyState, ToastProvider } from './ui'
import { Intro, INTRO_KEY } from './pages/Intro'
import { ContactPage, FeaturesPage, Home, IndustriesPage, LoginPage, PricingPage, ProductPage, PublicLayout, RegisterPage, SecurityPage } from './pages/Public'
import * as P from './pages/Platform'
import { WorkspaceLayout, WorkspaceOverview, PeoplePage, StaffPage, OperationsPage, ModulePage, PaymentsPage, ReportsPage, AutomationPage, SettingsPage, isInd } from './pages/Workspace'
import { CommsPage } from './pages/Comms'
import { BillingPage } from './pages/Billing'
import { BrandPage, DesignIndex, DesignLayout, MobilePage, MotionPage, SystemPage } from './pages/Design'

const seen = () => {
  try {
    return localStorage.getItem(INTRO_KEY) === '1'
  } catch {
    return true
  }
}

function NotFound({ dark }: { dark?: boolean }) {
  return (
    <div className={dark ? 'text-white py-24' : ''}>
      <EmptyState title="Page not found" body="This screen is not part of the prototype." action={<Button onClick={() => go('/design')}>Open design index</Button>} />
    </div>
  )
}

function Splash({ children }: { children?: ReactNode }) {
  return <div className="min-h-screen grid place-items-center bg-ng-canvas p-6 text-center"><div className="max-w-sm">{children ?? <div className="size-8 mx-auto rounded-full border-2 border-ng-ink border-t-transparent animate-spin" aria-label="Loading" />}</div></div>
}

/** Server-backed access gate. In demo mode (schema not installed) the prototype stays open on sample data. */
function Gate({ kind, ind, children }: { kind: 'platform' | 'app'; ind?: string; children: ReactNode }) {
  const a = useAuth()
  const ws = a.workspaces.find((w) => w.tenant_id === a.activeTenantId)
  const needLogin = a.backend === 'live' && a.ready && !a.session
  const wrongIndustry = kind === 'app' && ws?.organisation?.approval_status === 'approved' && ws.organisation.industry && ws.organisation.industry.key !== ind
  useEffect(() => {
    if (needLogin) go('/login')
    else if (wrongIndustry) go(a.homePath())
  }, [needLogin, wrongIndustry, a])
  if (a.backend === 'checking' || (a.backend === 'live' && !a.ready) || needLogin || wrongIndustry) return <Splash />
  if (a.backend === 'demo') return <>{children}</>
  if (kind === 'platform') {
    return a.platformRole ? <>{children}</> : <Splash><EmptyState title="Platform access required" body="This area is for NOVAGRID platform administrators." action={<Button onClick={() => go(a.homePath())}>Go to my workspace</Button>} /></Splash>
  }
  if (!ws?.organisation) return <Splash><EmptyState title="No organisation yet" body="Register an organisation, or ask an owner to invite you." action={<Button onClick={() => go('/register')}>Register an organisation</Button>} /></Splash>
  if (ws.organisation.approval_status !== 'approved') {
    const rejected = ws.organisation.approval_status === 'rejected'
    return <Splash><EmptyState title={rejected ? 'Registration not approved' : 'Awaiting category approval'} body={rejected ? 'Contact NOVAGRID support for details.' : `${ws.organisation.name} is waiting for the NOVAGRID team to approve its industry category. Business modules unlock after approval and subscription activation.`} action={<Button variant="secondary" onClick={async () => { await a.signOut(); go('/login') }}>Sign out</Button>} /></Splash>
  }
  return <>{children}</>
}

function DemoBadge() {
  const a = useAuth()
  if (a.backend !== 'demo' || window.self !== window.top) return null
  return <div title={a.backendNote} className="hidden md:block fixed bottom-4 right-4 z-[60] rounded-full bg-ng-midnight text-white text-xs px-3.5 py-2 shadow-ng-lg">Demo data · backend schema not installed</div>
}

function Routes() {
  const { path, query } = useRoute()
  const [introDone, setIntroDone] = useState(seen)
  const finish = useCallback(() => {
    try {
      localStorage.setItem(INTRO_KEY, '1')
    } catch {
      /* storage unavailable */
    }
    setIntroDone(true)
  }, [])
  const replay = useCallback(() => go('/'), [])
  const parts = path.split('/').filter(Boolean)
  const inFrame = window.self !== window.top

  if (path === '/intro') return <Intro onDone={replay} />

  let page: ReactNode
  if (parts[0] === 'platform') {
    const [, s, id] = parts
    const map: Record<string, ReactNode> = {
      overview: <P.PlatformOverview />,
      organisations: id ? <P.OrgProfile id={id} /> : <P.OrganisationsPage />,
      industries: <P.IndustriesAdmin />,
      approvals: id ? <P.ApprovalDetail id={id} /> : <P.ApprovalsPage />,
      subscriptions: <P.SubscriptionsAdmin />,
      plans: <P.PlansAdmin />,
      modules: <P.ModuleCatalogue />,
      analytics: <P.AnalyticsAdmin />,
      whitelabel: <P.WhiteLabelAdmin />,
      support: <P.SupportAdmin />,
      audit: <P.AuditAdmin />,
      settings: <P.SettingsAdmin />,
    }
    page = <Gate kind="platform"><P.PlatformLayout path={path}>{map[s] ?? <NotFound />}</P.PlatformLayout></Gate>
  } else if (parts[0] === 'app' && parts[1] && isInd(parts[1])) {
    const ind = parts[1]
    const s = parts[2] ?? 'overview'
    const body: ReactNode =
      s === 'overview' ? <WorkspaceOverview ind={ind} />
      : s === 'people' ? <PeoplePage ind={ind} />
      : s === 'staff' ? <StaffPage />
      : s === 'operations' ? <OperationsPage ind={ind} />
      : s === 'm' ? <ModulePage ind={ind} k={parts[3] ?? ''} />
      : s === 'comms' ? <CommsPage key={query.get('audience') ?? ''} ind={ind} audience={query.get('audience') ?? undefined} />
      : s === 'payments' ? <PaymentsPage />
      : s === 'reports' ? <ReportsPage />
      : s === 'automation' ? <AutomationPage ind={ind} />
      : s === 'settings' ? <SettingsPage ind={ind} />
      : s === 'billing' ? <BillingPage />
      : <NotFound />
    page = <Gate kind="app" ind={ind}><WorkspaceLayout ind={ind} path={path}>{body}</WorkspaceLayout></Gate>
  } else if (parts[0] === 'design') {
    const m: Record<string, ReactNode> = { brand: <BrandPage />, system: <SystemPage />, mobile: <MobilePage />, motion: <MotionPage /> }
    page = <DesignLayout path={path}>{parts[1] ? (m[parts[1]] ?? <NotFound />) : <DesignIndex />}</DesignLayout>
  } else if (path === '/login') {
    page = <PublicLayout path={path}><LoginPage /></PublicLayout>
  } else if (path === '/register') {
    page = <PublicLayout path={path}><RegisterPage /></PublicLayout>
  } else {
    const m: Record<string, ReactNode> = { '/': <Home />, '/product': <ProductPage />, '/industries': <IndustriesPage />, '/features': <FeaturesPage />, '/security': <SecurityPage />, '/pricing': <PricingPage />, '/contact': <ContactPage /> }
    page = <PublicLayout path={path}>{m[path] ?? <NotFound dark />}</PublicLayout>
  }

  return (
    <>
      {page}
      <DemoBadge />
      {path === '/' && !introDone && !inFrame && <Intro onDone={finish} />}
      {!inFrame && parts[0] !== 'design' && (
        <button onClick={() => go('/design')} className="hidden md:flex fixed bottom-4 left-4 z-[60] items-center gap-2 rounded-full bg-ng-midnight/90 text-white text-xs font-medium px-3.5 py-2 shadow-ng-lg hover:bg-ng-indigo hover:text-ng-midnight transition cursor-pointer">Design index</button>
      )}
    </>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </ToastProvider>
  )
}
