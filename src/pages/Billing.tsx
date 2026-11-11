import { useEffect, useState } from 'react'
import * as I from 'lucide-react'
import { useAuth } from '../lib/auth'
import { getMySubscription, listIndustryPlans, type OrganisationSubscription, type IndustryPlan } from '../lib/api/organisations'
import { inr } from '../data'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Status, Tabs } from '../ui'

export function BillingPage({ ind }: { ind: 'gym' | 'education' }) {
  const auth = useAuth()
  const workspace = auth.workspaces.find((w) => w.tenant_id === auth.activeTenantId)
  const tenantId = auth.backend === 'live' ? auth.activeTenantId : null
  const industryKey = workspace?.organisation?.industry?.key ?? ind
  const [tab, setTab] = useState('overview')
  const [subscription, setSubscription] = useState<OrganisationSubscription | null>(null)
  const [plans, setPlans] = useState<IndustryPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (auth.backend !== 'live' || !tenantId || !auth.ready) return
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([getMySubscription(tenantId), listIndustryPlans(industryKey)])
      .then(([current, available]) => {
        if (!alive) return
        setSubscription(current)
        setPlans(available)
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Could not load subscription information') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [auth.backend, auth.ready, tenantId, industryKey, attempt])

  if (auth.backend === 'checking' || (auth.backend === 'live' && !auth.ready)) {
    return <div className="p-8 text-sm text-ng-mute">Loading subscription information…</div>
  }
  if (auth.backend === 'demo') {
    return <><PageHeader title="Subscription & billing" sub="Preview only. Connect the approved NOVAGRID database to view your organisation's subscription." actions={<Badge tone="warn">Demo · Not billable</Badge>} /><Card className="p-6"><EmptyState title="Live billing is not connected" body={auth.backendNote || 'The application is currently using sample data. No plan selection or payment can be made.'} /></Card></>
  }
  if (!workspace?.organisation || !tenantId) {
    return <><PageHeader title="Subscription & billing" /><Card className="p-6"><EmptyState title="No active organisation" body="An approved organisation workspace is required to view subscription details." /></Card></>
  }

  return (
    <>
      <PageHeader title="Subscription & billing" sub={workspace.organisation.name + ' · ' + (workspace.organisation.industry?.name ?? 'Industry')} actions={<Badge tone="warn">Payment checkout not connected</Badge>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'plans', label: 'Plans' }]} />
      {error ? <div className="mt-5"><ErrorState onRetry={() => setAttempt((v) => v + 1)} /></div> : null}
      {tab === 'overview' && <div className="mt-5 space-y-4">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="text-xs uppercase tracking-wide text-ng-mute">Current subscription</div><div className="mt-2 text-2xl font-bold">{subscription?.plan?.name ?? 'No subscription assigned'}</div><div className="mt-1 text-sm text-ng-mute">{subscription?.plan ? inr(subscription.plan.price_inr_monthly) + ' / month' : 'A platform administrator must assign a trial or subscription after category approval.'}</div></div>
            {subscription ? <Status value={subscription.status} /> : <Badge tone="warn">Not active</Badge>}
          </div>
          {subscription && <div className="mt-5 grid sm:grid-cols-2 gap-4 border-t border-ng-line pt-4 text-sm"><div><div className="text-xs text-ng-mute">Period started</div><b>{new Date(subscription.period_start).toLocaleDateString()}</b></div><div><div className="text-xs text-ng-mute">Period ends</div><b>{new Date(subscription.period_end).toLocaleDateString()}</b></div></div>}
          {loading && <div className="mt-4 text-sm text-ng-mute">Refreshing records…</div>}
          <Button className="mt-5" variant="secondary" size="sm" disabled={loading} onClick={() => setAttempt((v) => v + 1)}><I.RefreshCw size={14} /> Refresh</Button>
        </Card>
        <p className="text-xs text-ng-mute">Plan activation, renewal, invoices and payments are not available yet. Do not transfer money based on this screen.</p>
      </div>}
      {tab === 'plans' && <div className="mt-5">
        <p className="mb-4 text-sm text-ng-mute">Only plans for your organisation's approved industry are shown. Selecting a plan does not purchase or activate it.</p>
        {loading ? <Card className="p-5 text-sm text-ng-mute">Loading industry plans…</Card> : plans.length === 0 ? <Card className="p-5"><EmptyState title="No plans available" body="No active plans are configured for this industry yet." /></Card> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{plans.map((plan) => <Card key={plan.key} className="p-5"><div className="font-semibold">{plan.name}</div><div className="mt-3 text-2xl font-bold">{inr(plan.price_inr_monthly)}<span className="text-sm font-normal text-ng-mute"> /mo</span></div><div className="text-xs text-ng-mute mt-1">{inr(plan.price_inr_yearly)} billed yearly</div><ul className="mt-4 space-y-2 text-sm text-ng-mute">{Object.entries(plan.limits ?? {}).map(([key, value]) => <li key={key}>{key.replaceAll('_', ' ')}: {value}</li>)}</ul><Button className="mt-5 w-full" variant="secondary" disabled><I.Lock size={14} /> Checkout not available</Button></Card>)}</div>}
      </div>}
    </>
  )
}
