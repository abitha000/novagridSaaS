import { useCallback, useState, type ReactNode } from 'react'
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
    page = <P.PlatformLayout path={path}>{map[s] ?? <NotFound />}</P.PlatformLayout>
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
    page = <WorkspaceLayout ind={ind} path={path}>{body}</WorkspaceLayout>
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
      <Routes />
    </ToastProvider>
  )
}
