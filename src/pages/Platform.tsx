import { useState, type ReactNode } from 'react'
import * as I from 'lucide-react'
import { Link, go } from '../lib/router'
import { useAuth } from '../lib/auth'
import { approvals, industries, months, orgGrowth, orgs, planTiers, industryPlanTiers, revenue, inr, type Org } from '../data'
import { AreaChart, Avatar, Badge, BarChart, Button, Card, CardHeader, Confirm, DataTable, Donut, Dropdown, EmptyState, ErrorState, Field, Logo, Modal, PageHeader, SearchBox, Select, Stat, Status, Tabs, Textarea, Toggle, cx, useFakeLoad, useToast, Skel } from '../ui'

const items = [
  ['Overview', '/platform/overview', I.LayoutDashboard],
  ['Organisations', '/platform/organisations', I.Building2],
  ['Industry Categories', '/platform/industries', I.Shapes],
  ['Approvals', '/platform/approvals', I.BadgeCheck],
  ['Subscriptions', '/platform/subscriptions', I.Repeat],
  ['Plans & Pricing', '/platform/plans', I.Tag],
  ['Module Catalogue', '/platform/modules', I.Blocks],
  ['Usage Analytics', '/platform/analytics', I.ChartLine],
  ['White-label', '/platform/whitelabel', I.Palette],
  ['Support', '/platform/support', I.LifeBuoy],
  ['Audit Logs', '/platform/audit', I.ScrollText],
  ['System Settings', '/platform/settings', I.Settings],
] as const

export function PlatformLayout({ path, children }: { path: string; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false)
  const auth = useAuth()
  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-none">
      {items.map(([l, to, Ic]) => {
        const active = path.startsWith(to)
        return (
          <Link key={to} to={to} title={l} onClick={() => setDrawer(false)} className={cx('relative flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-all', active ? 'bg-ng-indigo/20 text-white' : 'text-white/55 hover:text-white hover:bg-white/5 hover:translate-x-0.5')}>
            {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded bg-ng-sky" />}
            <Ic size={18} className="shrink-0" /><span className="md:hidden lg:inline">{l}</span>
            {l === 'Approvals' && <span className="ml-auto md:hidden lg:inline rounded-full bg-ng-indigo px-1.5 text-[11px]">4</span>}
          </Link>
        )
      })}
    </nav>
  )
  const head = (
    <div className="h-16 px-5 flex items-center border-b border-white/10 md:justify-center lg:justify-start">
      <span className="md:hidden lg:block"><Logo dark size={28} /></span>
      <span className="hidden md:block lg:hidden"><Logo dark compact size={30} /></span>
    </div>
  )
  return (
    <div className="min-h-screen bg-ng-canvas md:pl-[72px] lg:pl-[264px]">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[72px] lg:w-[264px] flex-col bg-ng-midnight text-white z-30">
        {head}{nav}
        <div className="p-3 border-t border-white/10"><div className="rounded-lg bg-white/5 p-3 md:hidden lg:block"><div className="text-[11px] uppercase tracking-wider text-ng-sky font-semibold">Platform console</div><div className="text-xs text-white/50 mt-1">Restricted to NOVAGRID staff. All actions are audited.</div></div></div>
      </aside>
      {drawer && (
        <div className="md:hidden fixed inset-0 z-50"><div className="absolute inset-0 bg-black/60 animate-fade" onClick={() => setDrawer(false)} /><aside className="absolute inset-y-0 left-0 w-72 flex flex-col bg-ng-midnight text-white animate-sheet [animation-name:fade]">{head}{nav}</aside></div>
      )}
      <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 md:px-8 bg-white/85 backdrop-blur border-b border-ng-line">
        <button className="md:hidden size-10 grid place-items-center rounded-lg hover:bg-ng-canvas cursor-pointer" aria-label="Open navigation" onClick={() => setDrawer(true)}><I.Menu /></button>
        <Badge tone="violet">Platform owner</Badge>
        <div className="flex-1" />
        <button className="relative size-10 grid place-items-center rounded-lg hover:bg-ng-canvas text-ng-mute cursor-pointer" aria-label="Notifications"><I.Bell size={19} /><span className="absolute top-2 right-2.5 size-2 rounded-full bg-ng-indigo" /></button>
        <Dropdown label="Account menu" trigger={<span className="flex items-center gap-2"><Avatar name="Ishaan Verma" /><span className="hidden sm:block text-left text-sm leading-tight"><b className="block">Ishaan Verma</b><span className="text-xs text-ng-mute">Super Admin</span></span></span>} items={[{ label: 'My profile', icon: <I.User size={16} /> }, { label: 'Security & MFA', icon: <I.ShieldCheck size={16} /> }, { divider: true, label: '' }, { label: 'Open an organisation workspace', icon: <I.ExternalLink size={16} />, onClick: () => go('/app/education/overview') }, { label: 'Log out', icon: <I.LogOut size={16} />, onClick: async () => { await auth.signOut(); go('/login') }, danger: true }]} />
      </header>
      <main key={path} className="px-4 md:px-8 py-6 md:py-8 max-w-[1400px] animate-fade">{children}</main>
    </div>
  )
}

export function PlatformOverview() {
  const loading = useFakeLoad(800)
  const [range, setRange] = useState('12m')
  const n = range === '12m' ? 12 : 6
  return (
    <>
      <PageHeader title="Platform overview" sub="Sample data for the design prototype." actions={<><Select className="!w-36" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Range"><option value="12m">Last 12 months</option><option value="6m">Last 6 months</option></Select><Button icon={<I.Download size={16} />} variant="secondary">Export</Button></>} />
      {loading ? <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skel key={i} className="h-32" />)}</div> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Stat i={0} label="Total organisations" value="162" delta="+16.5%" icon={<I.Building2 size={18} />} />
          <Stat i={1} label="Active organisations" value="131" delta="+9.2%" icon={<I.CircleCheck size={18} />} />
          <Stat i={2} label="Pending approvals" value="4" delta="-2" icon={<I.BadgeCheck size={18} />} />
          <Stat i={3} label="Monthly recurring revenue" value="₹16.3L" delta="+15.6%" icon={<I.IndianRupee size={18} />} />
        </div>
      )}
      <div className="grid xl:grid-cols-2 gap-4 mt-4">
        <Card><CardHeader title="Organisation growth" sub="Total registered organisations" /><div className="p-5">{loading ? <Skel className="h-56" /> : <AreaChart key={range} data={orgGrowth.slice(-n)} labels={months.slice(-n)} />}</div></Card>
        <Card><CardHeader title="Revenue trend" sub="MRR in ₹ lakh (sample)" /><div className="p-5">{loading ? <Skel className="h-56" /> : <BarChart key={range} data={revenue.slice(-n)} labels={months.slice(-n).map((m) => m[0])} format={(v) => `₹${v}L`} />}</div></Card>
        <Card><CardHeader title="Industry distribution" /><div className="p-5">{loading ? <Skel className="h-40" /> : <Donut center={<div><div className="text-2xl font-bold">162</div><div className="text-xs text-ng-mute">orgs</div></div>} parts={[{ label: 'Gym & Fitness', value: 58, color: '#08090b' }, { label: 'Schools & Colleges', value: 44, color: '#cdf22b' }, { label: 'Hotels & Restaurants', value: 31, color: '#7d9a0a' }, { label: 'Other', value: 29, color: '#cfcabb' }]} />}</div></Card>
        <Card><CardHeader title="Subscription distribution" /><div className="p-5">{loading ? <Skel className="h-40" /> : <Donut center={<div><div className="text-2xl font-bold">131</div><div className="text-xs text-ng-mute">paying</div></div>} parts={[{ label: 'Professional', value: 52, color: '#08090b' }, { label: 'Basic', value: 61, color: '#7d9a0a' }, { label: 'Enterprise', value: 18, color: '#5b6b10' }, { label: 'Trial', value: 31, color: '#cfcabb' }]} />}</div></Card>
      </div>
      <Card className="mt-4"><CardHeader title="Awaiting your decision" action={<Button size="sm" variant="ghost" onClick={() => go('/platform/approvals')}>View all</Button>} />
        <div className="p-2">{approvals.slice(0, 3).map((a) => <button key={a.id} onClick={() => go('/platform/approvals/' + a.id)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-ng-canvas text-left cursor-pointer"><Avatar name={a.org} /><div className="flex-1 min-w-0"><div className="font-medium truncate">{a.org}</div><div className="text-xs text-ng-mute">{a.requested} · {a.submitted}</div></div><Status value="Pending" /><I.ChevronRight size={16} className="text-ng-mute" /></button>)}</div>
      </Card>
    </>
  )
}

export function OrganisationsPage() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('All')
  const [ind, setInd] = useState('All')
  const [target, setTarget] = useState<Org | null>(null)
  const [failed, setFailed] = useState(false)
  const [list, setList] = useState(orgs)
  const [attempt, setAttempt] = useState(0)
  const loading = useFakeLoad(700, [attempt])
  const rows = list.filter((o) => (status === 'All' || o.status === status) && (ind === 'All' || o.industry === ind) && (o.name + o.owner).toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Organisations" sub={`${list.length} organisations across ${new Set(list.map((o) => o.industry)).size} industries`} actions={<><Button variant="secondary" icon={<I.Download size={16} />} onClick={() => toast('Export started. You will be notified when ready.', 'info')}>Export</Button><Button variant="ghost" onClick={() => setFailed(!failed)}>{failed ? 'Hide' : 'Preview'} error state</Button></>} />
      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-ng-line">
          <SearchBox value={q} onChange={setQ} placeholder="Search organisation or owner" className="md:w-80" />
          <Select className="md:!w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">{['All', 'Active', 'Trial', 'Pending', 'Grace', 'Suspended'].map((s) => <option key={s}>{s}</option>)}</Select>
          <Select className="md:!w-52" value={ind} onChange={(e) => setInd(e.target.value)} aria-label="Industry filter"><option>All</option>{[...new Set(orgs.map((o) => o.industry))].map((s) => <option key={s}>{s}</option>)}</Select>
        </div>
        {failed ? <ErrorState onRetry={() => { setFailed(false); setAttempt(attempt + 1) }} /> : (
          <DataTable loading={loading} rows={rows} onRow={(o) => go('/platform/organisations/' + o.id)} empty={<EmptyState title="No organisations match" body="Clear the search or filters to see everyone." action={<Button variant="secondary" onClick={() => { setQ(''); setStatus('All'); setInd('All') }}>Clear filters</Button>} />}
            cols={[
              { key: 'name', header: 'Organisation', mobile: 'title', render: (o) => <div className="flex items-center gap-3"><Avatar name={o.name} /><div><div className="font-medium">{o.name}</div><div className="text-xs text-ng-mute">{o.city}</div></div></div> },
              { key: 'industry', header: 'Industry' },
              { key: 'owner', header: 'Owner', mobile: 'hide' },
              { key: 'plan', header: 'Plan', render: (o) => <Badge tone="brand" dot={false}>{o.plan}</Badge> },
              { key: 'status', header: 'Status', render: (o) => <Status value={o.status} /> },
              { key: 'date', header: 'Registered', mobile: 'hide' },
              { key: 'a', header: '', className: 'w-10', mobile: 'hide', render: (o) => <span onClick={(e) => e.stopPropagation()}><Dropdown label={`Actions for ${o.name}`} trigger={<span className="size-8 grid place-items-center rounded-lg hover:bg-ng-tint"><I.MoreHorizontal size={18} /></span>} items={[{ label: 'View profile', icon: <I.Eye size={16} />, onClick: () => go('/platform/organisations/' + o.id) }, { label: 'Open support session', icon: <I.LifeBuoy size={16} />, onClick: () => toast('Support access request sent to the organisation owner', 'info') }, { divider: true, label: '' }, o.status === 'Suspended' ? { label: 'Reinstate', icon: <I.RotateCcw size={16} />, onClick: () => { setList(list.map((x) => (x.id === o.id ? { ...x, status: 'Active' } : x))); toast(o.name + ' reinstated') } } : { label: 'Suspend', icon: <I.Ban size={16} />, danger: true, onClick: () => setTarget(o) }]} /></span> },
            ]} />
        )}
      </Card>
      <Confirm danger open={!!target} onClose={() => setTarget(null)} title={`Suspend ${target?.name}?`} confirmLabel="Suspend organisation" body="Staff will lose access immediately and scheduled messages will pause. Data is kept. This is recorded in the audit log." onConfirm={() => { setList(list.map((x) => (x.id === target!.id ? { ...x, status: 'Suspended' } : x))); toast(target!.name + ' suspended') }} />
    </>
  )
}

export function OrgProfile({ id }: { id: string }) {
  const org = orgs.find((o) => o.id === id) ?? orgs[0]
  const [tab, setTab] = useState('overview')
  const toast = useToast()
  return (
    <>
      <PageHeader back={<Link to="/platform/organisations" className="text-sm text-ng-mute hover:text-ng-indigo inline-flex items-center gap-1 mb-2"><I.ArrowLeft size={14} />Organisations</Link>} title={org.name} sub={`${org.industry} · ${org.city}`} actions={<><Status value={org.status} /><Button variant="secondary" onClick={() => toast('Support access requested', 'info')} icon={<I.LifeBuoy size={16} />}>Request support access</Button></>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'sub', label: 'Subscription' }, { id: 'modules', label: 'Modules' }, { id: 'activity', label: 'Activity' }]} />
      <div key={tab} className="mt-6 animate-fade">
        {tab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-5"><h3 className="font-semibold mb-4">Organisation details</h3><dl className="grid sm:grid-cols-2 gap-5 text-sm">{[['Owner', org.owner], ['Email', org.email], ['City', org.city], ['Registered', org.date], ['Staff accounts', String(org.staff)], ['Contacts', org.contacts.toLocaleString('en-IN')]].map(([a, b]) => <div key={a}><dt className="text-ng-mute text-xs uppercase tracking-wide">{a}</dt><dd className="mt-1 font-medium">{b}</dd></div>)}</dl></Card>
            <Card className="p-5"><h3 className="font-semibold mb-4">Assigned category</h3><div className="flex items-center gap-3"><span className="size-11 rounded-xl bg-ng-midnight text-ng-lime grid place-items-center"><I.Shapes /></span><div><div className="font-semibold">{org.industry}</div><Badge tone="ok">Approved</Badge></div></div><p className="text-xs text-ng-mute mt-4">Only platform administrators can change a category. Changes are logged and require a reason.</p><Button variant="secondary" size="sm" className="mt-4">Change category</Button></Card>
          </div>
        )}
        {tab === 'sub' && <Card className="p-5 grid sm:grid-cols-3 gap-5 text-sm">{[['Plan', org.plan], ['Status', org.status], ['Next renewal', '14 Jun 2025'], ['Billing', 'Yearly (sample)'], ['Add-ons', org.plan === 'Enterprise' ? 'White-label' : 'None'], ['Usage', '62% of message limit']].map(([a, b]) => <div key={a}><div className="text-ng-mute text-xs uppercase tracking-wide">{a}</div><div className="mt-1 font-medium">{b}</div></div>)}</Card>}
        {tab === 'modules' && <Card className="p-5"><p className="text-sm text-ng-mute mb-4">Modules available to this organisation. Industry modules come from its approved category only.</p><div className="grid sm:grid-cols-2 gap-2">{['Contacts', 'Staff', 'Notifications', 'Payments', 'Reports', ...(org.industry.startsWith('Gym') ? ['Members', 'Attendance', 'Renewals'] : org.industry.startsWith('Schools') ? ['Students', 'Transport', 'Timetables'] : ['Industry modules (catalogue)'])].map((m) => <div key={m} className="flex items-center justify-between rounded-lg border border-ng-line px-4 py-3 text-sm">{m}<Badge tone="ok">Enabled</Badge></div>)}</div></Card>}
        {tab === 'activity' && <Card className="divide-y divide-ng-line">{[['Subscription renewed', '2 days ago'], ['Staff member invited', '5 days ago'], ['Category approved by Ishaan Verma', '3 months ago'], ['Organisation registered', org.date]].map(([a, b]) => <div key={a} className="flex justify-between px-5 py-3.5 text-sm"><span>{a}</span><span className="text-ng-mute">{b}</span></div>)}</Card>}
      </div>
    </>
  )
}

export function ApprovalsPage() {
  const [list, setList] = useState(approvals)
  const loading = useFakeLoad(600)
  return (
    <>
      <PageHeader title="Approvals" sub="Category approval is separate from subscription activation." />
      <Card>
        {loading ? <div className="p-5 space-y-3">{[0, 1, 2].map((i) => <Skel key={i} className="h-16" />)}</div> : list.length === 0 ? <EmptyState icon={<I.PartyPopper size={26} />} title="Queue cleared" body="No organisations are waiting for category approval." action={<Button variant="secondary" onClick={() => setList(approvals)}>Reset demo</Button>} /> : (
          <div className="divide-y divide-ng-line">
            {list.map((a, i) => (
              <button key={a.id} onClick={() => go('/platform/approvals/' + a.id)} style={{ animationDelay: i * 60 + 'ms' }} className="animate-rise w-full flex flex-col sm:flex-row sm:items-center gap-3 p-5 text-left hover:bg-ng-canvas transition cursor-pointer">
                <div className="flex items-center gap-3 flex-1 min-w-0"><Avatar name={a.org} size={40} /><div className="min-w-0"><div className="font-semibold truncate">{a.org}</div><div className="text-sm text-ng-mute">{a.owner} · {a.city}</div></div></div>
                <div className="text-sm"><div className="text-ng-mute text-xs">Requested category</div>{a.requested}</div>
                <Badge tone={a.risk === 'Low' ? 'ok' : a.risk === 'Needs review' ? 'warn' : 'err'}>{a.risk}</Badge>
                <span className="text-xs text-ng-mute w-24">{a.submitted}</span>
                <I.ChevronRight className="text-ng-mute hidden sm:block" size={18} />
              </button>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

export function ApprovalDetail({ id }: { id: string }) {
  const a = approvals.find((x) => x.id === id) ?? approvals[0]
  const toast = useToast()
  const [decision, setDecision] = useState<'approve' | 'reject' | 'change' | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [cat, setCat] = useState(a.requested)
  const [busy, setBusy] = useState(false)
  const commit = () => {
    setBusy(true)
    setTimeout(() => { setBusy(false); setDone(decision === 'approve' ? `Category approved: ${a.requested}` : decision === 'change' ? `Category changed to ${cat} and approved` : 'Registration rejected'); toast(decision === 'reject' ? 'Rejection recorded and owner notified' : 'Category approved. Subscription is a separate step.'); setDecision(null) }, 900)
  }
  return (
    <>
      <PageHeader back={<Link to="/platform/approvals" className="text-sm text-ng-mute hover:text-ng-indigo inline-flex items-center gap-1 mb-2"><I.ArrowLeft size={14} />Approvals</Link>} title={a.org} sub={`Submitted ${a.submitted}`} actions={!done && <><Button variant="secondary" onClick={() => setDecision('reject')}>Reject</Button><Button variant="secondary" onClick={() => setDecision('change')}>Change category</Button><Button icon={<I.Check size={16} />} onClick={() => setDecision('approve')}>Approve category</Button></>} />
      {done && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm flex items-center gap-2 animate-pop"><I.CircleCheck size={18} />{done}. The organisation can now choose a plan.</div>}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5"><h3 className="font-semibold mb-4">Registration details</h3><dl className="grid sm:grid-cols-2 gap-5 text-sm">{[['Owner', a.owner], ['Location', a.city], ['Organisation type', a.type], ['Preferred plan', a.plan], ['Email', 'Verified'], ['Phone', 'Verified']].map(([x, y]) => <div key={x}><dt className="text-xs uppercase tracking-wide text-ng-mute">{x}</dt><dd className="mt-1 font-medium">{y === 'Verified' ? <Status value="Verified" /> : y}</dd></div>)}</dl>
          <h3 className="font-semibold mt-8 mb-3">Supporting documents ({a.docs})</h3>
          <div className="space-y-2">{Array.from({ length: a.docs }).map((_, i) => <div key={i} className="flex items-center gap-3 rounded-lg border border-ng-line px-4 py-3 text-sm"><I.FileText size={18} className="text-ng-indigo-d" /><span className="flex-1">{['Business registration.pdf', 'Owner ID proof.pdf', 'Facility licence.pdf'][i]}</span><Button size="sm" variant="ghost">Preview</Button></div>)}</div></Card>
        <div className="space-y-4">
          <Card className="p-5"><h3 className="font-semibold">Requested category</h3><div className="mt-3 flex items-center gap-3"><span className="size-11 rounded-xl bg-ng-midnight text-ng-lime grid place-items-center"><I.Shapes /></span><div className="font-medium">{a.requested}</div></div>{a.risk !== 'Low' && <div className="mt-4 rounded-lg bg-amber-50 text-amber-800 text-sm p-3 flex gap-2"><I.TriangleAlert size={16} className="mt-0.5 shrink-0" />{a.risk === 'Category mismatch' ? 'Organisation type does not match the requested category.' : 'Healthcare category: legal and compliance review recommended.'}</div>}</Card>
          <Card className="p-5"><h3 className="font-semibold mb-3">Approval pipeline</h3>{[['Registered', 1], ['Verified', 1], ['Category approval', done ? 1 : 0], ['Plan & payment', -1], ['Activation', -1]].map(([l, s]) => <div key={l as string} className="flex items-center gap-3 py-1.5 text-sm"><span className={cx('size-5 rounded-full grid place-items-center text-white', s === 1 ? 'bg-ng-ok' : s === 0 ? 'bg-ng-indigo animate-pulse-ring' : 'bg-slate-200')}>{s === 1 && <I.Check size={12} />}</span><span className={s === -1 ? 'text-ng-mute' : 'font-medium'}>{l as string}</span></div>)}</Card>
        </div>
      </div>
      <Modal open={!!decision} onClose={() => setDecision(null)} title={decision === 'approve' ? 'Approve category' : decision === 'change' ? 'Change category' : 'Reject registration'} footer={<><Button variant="secondary" onClick={() => setDecision(null)}>Cancel</Button><Button loading={busy} variant={decision === 'reject' ? 'danger' : 'primary'} onClick={commit}>{decision === 'reject' ? 'Reject' : 'Confirm'}</Button></>}>
        <div className="space-y-4">
          {decision === 'change' && <Field label="Assigned category"><Select value={cat} onChange={(e) => setCat(e.target.value)}>{industries.map((i) => <option key={i.key}>{i.name}</option>)}</Select></Field>}
          <Field label={decision === 'approve' ? 'Note (optional)' : 'Reason (required, sent to owner)'}><Textarea rows={3} placeholder="Recorded in the audit log" /></Field>
          {decision === 'approve' && <p className="text-xs text-ng-mute">Approving a category does not activate a subscription.</p>}
        </div>
      </Modal>
    </>
  )
}

export function IndustriesAdmin() {
  const [on, setOn] = useState<Record<string, boolean>>(Object.fromEntries(industries.map((i, n) => [i.key, n < 4])))
  return (
    <>
      <PageHeader title="Industry categories" sub="Each category maps to exactly one module package." actions={<Button icon={<I.Plus size={16} />}>Add category</Button>} />
      <Card><DataTable rows={industries.map((i, n) => ({ ...i, id: i.key, orgs: [58, 44, 6, 9, 11, 4, 8, 3, 2, 1, 7, 9][n] }))} cols={[
        { key: 'name', header: 'Category', mobile: 'title', render: (r) => <span className="font-medium">{r.name}</span> },
        { key: 'phase', header: 'Module package' },
        { key: 'orgs', header: 'Organisations' },
        { key: 'on', header: 'Available for registration', render: (r) => <Toggle label={`Enable ${r.name}`} on={on[r.key]} onChange={(v) => setOn({ ...on, [r.key]: v })} /> },
      ]} /></Card>
    </>
  )
}

export function SubscriptionsAdmin() {
  const [filter, setFilter] = useState('All')
  const rows = orgs.filter((o) => o.status !== 'Pending').filter((o) => filter === 'All' || o.status === filter)
  return (
    <>
      <PageHeader title="Subscriptions" sub="Plan, status and renewal for every organisation." />
      <div className="grid sm:grid-cols-3 gap-4 mb-4"><Stat label="Active" value="108" icon={<I.CircleCheck size={18} />} /><Stat label="In grace period" value="7" icon={<I.Clock size={18} />} /><Stat label="Read-only / suspended" value="5" icon={<I.Lock size={18} />} /></div>
      <Card><div className="p-4 border-b border-ng-line"><Select className="sm:!w-48" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Status"><option>All</option><option>Active</option><option>Trial</option><option>Grace</option><option>Suspended</option></Select></div>
        <DataTable rows={rows} cols={[{ key: 'name', header: 'Organisation', mobile: 'title', render: (o) => <span className="font-medium">{o.name}</span> }, { key: 'plan', header: 'Plan' }, { key: 'status', header: 'Status', render: (o) => <Status value={o.status} /> }, { key: 'r', header: 'Renews', render: () => '14 Jun 2025' }, { key: 'mrr', header: 'MRR', render: (o) => (o.plan === 'Enterprise' ? '₹24,000' : o.plan === 'Professional' ? '₹4,166' : '₹1,200') }]} /></Card>
    </>
  )
}

export function PlansAdmin() {
  const toast = useToast()
  const plans = [
    ...industryPlanTiers.gym.map((p) => ({ ...p, industry: 'Gym & Fitness' })),
    ...industryPlanTiers.education.map((p) => ({ ...p, industry: 'Education' })),
  ]
  return (
    <>
      <PageHeader title="Plans & pricing" sub="Initial proposed India launch prices. Messaging delivery charges are billed separately." actions={<Badge tone="warn">Commercial review required</Badge>} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((p, i) => <Card key={p.key} hover className="p-5 animate-rise" style={{ animationDelay: i * 70 + 'ms' }}>
          <div className="flex justify-between items-start gap-2"><div><h3 className="font-semibold">{p.name}</h3><div className="text-xs text-ng-mute mt-1">{p.industry}</div></div><Badge tone="neutral">Proposed</Badge></div>
          <div className="text-2xl font-bold mt-3">{inr(p.m)}<span className="text-sm text-ng-mute font-normal"> /mo</span></div>
          <div className="text-xs text-ng-mute">{inr(p.y)} billed annually · two months' discount</div>
          <ul className="mt-4 space-y-1.5 text-sm text-ng-mute">{p.limits.map((l) => <li key={l}>• {l}</li>)}</ul>
          <Button variant="secondary" size="sm" className="mt-5 w-full" onClick={() => toast(`Pricing for ${p.industry} · ${p.name} is configured in the database migration; live editing will be enabled through the secured platform API.`, 'info')}>View plan configuration</Button>
        </Card>)}
      </div>
      <Card className="mt-4 p-5 text-sm"><b>Commercial rules:</b> Each organisation selects plans only within its approved industry. Student/member and staff limits are enforced by backend entitlements. WhatsApp and SMS provider charges are separate usage-based costs; never promise unlimited delivery.</Card>
    </>
  )
}

export function ModuleCatalogue() {
  const cols = ['Gym', 'Education', 'Hospital', 'Hotel']
  const core = ['Contacts', 'Staff', 'Notifications', 'Payments', 'Reports', 'Documents', 'Automation']
  const spec: [string, number][] = [['Members & memberships', 0], ['Attendance (gym)', 0], ['Trainers', 0], ['Students & guardians', 1], ['Transport & buses', 1], ['Timetables & exams', 1], ['Patients & queue', 2], ['Appointments', 2], ['Rooms & reservations', 3], ['Housekeeping', 3]]
  return (
    <>
      <PageHeader title="Module catalogue" sub="Core modules are shared. Industry modules belong to exactly one category." />
      <Card className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]"><thead><tr className="border-b border-ng-line text-xs uppercase tracking-wide text-ng-mute"><th className="text-left px-5 py-3">Module</th>{cols.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}</tr></thead><tbody>
        {core.map((m) => <tr key={m} className="border-b border-ng-line/70"><td className="px-5 py-3 font-medium">{m} <Badge tone="brand" dot={false}>Core</Badge></td>{cols.map((c) => <td key={c} className="text-center"><I.Check size={16} className="inline text-ng-ok" /></td>)}</tr>)}
        {spec.map(([m, k]) => <tr key={m} className="border-b border-ng-line/70 last:border-0"><td className="px-5 py-3">{m}</td>{cols.map((c, i) => <td key={c} className="text-center">{i === k ? <I.Check size={16} className="inline text-ng-ok" /> : <I.Minus size={16} className="inline text-slate-300" />}</td>)}</tr>)}
      </tbody></table></Card>
    </>
  )
}

export function AnalyticsAdmin() {
  return (
    <>
      <PageHeader title="Usage analytics" sub="Platform-wide, sample data." />
      <div className="grid xl:grid-cols-2 gap-4">
        <Card><CardHeader title="Messages sent (thousands)" /><div className="p-5"><AreaChart data={[40, 52, 61, 58, 74, 88, 96, 121, 133, 150, 171, 198]} labels={months} color="#08090b" format={(v) => v + 'k'} /></div></Card>
        <Card><CardHeader title="Messages by channel" /><div className="p-5"><Donut parts={[{ label: 'WhatsApp', value: 62, color: '#08090b' }, { label: 'SMS', value: 24, color: '#7d9a0a' }, { label: 'Email', value: 14, color: '#cdf22b' }]} center={<div className="text-sm text-ng-mute">share<br />%</div>} /></div></Card>
        <Card className="xl:col-span-2"><CardHeader title="Organisations near limits" /><DataTable rows={[{ id: 1, o: 'Pulse Fitness Club', m: 'Messages', u: '91%' }, { id: 2, o: 'Greenfield Public School', m: 'Contacts', u: '88%' }, { id: 3, o: 'Iron Temple Gym', m: 'Staff', u: '100%' }]} cols={[{ key: 'o', header: 'Organisation', mobile: 'title' }, { key: 'm', header: 'Metric' }, { key: 'u', header: 'Usage', render: (r) => <Badge tone={r.u === '100%' ? 'err' : 'warn'}>{r.u}</Badge> }]} /></Card>
      </div>
    </>
  )
}

export function WhiteLabelAdmin() {
  const [on, setOn] = useState<Record<string, boolean>>({ o1: false, o2: true, o8: true })
  return (
    <>
      <PageHeader title="White-label" sub="Premium add-on. Control which organisations may use their own branding." />
      <Card><DataTable rows={orgs.filter((o) => ['o1', 'o2', 'o8'].includes(o.id))} cols={[{ key: 'name', header: 'Organisation', mobile: 'title', render: (o) => <span className="font-medium">{o.name}</span> }, { key: 'plan', header: 'Plan' }, { key: 'domain', header: 'Custom domain', render: (o) => (on[o.id] ? <code className="text-xs">portal.{o.name.split(' ')[0].toLowerCase()}.example</code> : <span className="text-ng-mute">Not set</span>) }, { key: 'on', header: 'White-label', render: (o) => <Toggle on={!!on[o.id]} onChange={(v) => setOn({ ...on, [o.id]: v })} label={`White-label for ${o.name}`} /> }]} /></Card>
    </>
  )
}

export function SupportAdmin() {
  const [tab, setTab] = useState('grants')
  return (
    <>
      <PageHeader title="Support" sub="Time-boxed, reason-logged access to organisation workspaces." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'grants', label: 'Access grants', count: 2 }, { id: 'tickets', label: 'Tickets', count: 3 }]} />
      <Card className="mt-5"><DataTable rows={tab === 'grants' ? [{ id: 1, a: 'Pulse Fitness Club', b: 'Karan (Support)', c: 'Billing question', d: 'Expires in 1h 20m' }, { id: 2, a: 'Harbor View Hotel', b: 'Divya (Support)', c: 'Import help', d: 'Expires in 3h' }] : [{ id: 1, a: 'Greenfield Public School', b: 'Cannot import students', c: 'High', d: 'Open' }, { id: 2, a: 'Iron Temple Gym', b: 'Invoice copy', c: 'Low', d: 'Open' }, { id: 3, a: 'Spice Route Kitchen', b: 'Suspension appeal', c: 'Medium', d: 'Open' }]} cols={[{ key: 'a', header: 'Organisation', mobile: 'title' }, { key: 'b', header: tab === 'grants' ? 'Support agent' : 'Subject' }, { key: 'c', header: tab === 'grants' ? 'Reason' : 'Priority' }, { key: 'd', header: tab === 'grants' ? 'Access' : 'Status' }]} /></Card>
    </>
  )
}

export function AuditAdmin() {
  const [q, setQ] = useState('')
  const rows = [['Ishaan Verma', 'Approved category', 'Pulse Fitness Club', '10:42'], ['Ishaan Verma', 'Suspended organisation', 'Spice Route Kitchen', '10:11'], ['Divya (Support)', 'Support access granted', 'Harbor View Hotel', '09:58'], ['System', 'Subscription grace started', 'Iron Temple Gym', '09:00'], ['Ishaan Verma', 'Edited plan limits', 'Professional', 'Yesterday']].map((r, i) => ({ id: i, actor: r[0], action: r[1], target: r[2], time: r[3] }))
  return (
    <>
      <PageHeader title="Audit logs" sub="Append-only record of platform actions." actions={<Button variant="secondary" icon={<I.Download size={16} />}>Export</Button>} />
      <Card><div className="p-4 border-b border-ng-line"><SearchBox value={q} onChange={setQ} placeholder="Search actor, action or target" className="sm:w-80" /></div>
        <DataTable rows={rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(q.toLowerCase()))} cols={[{ key: 'actor', header: 'Actor', mobile: 'title' }, { key: 'action', header: 'Action' }, { key: 'target', header: 'Target' }, { key: 'time', header: 'When' }]} /></Card>
    </>
  )
}

export function SettingsAdmin() {
  const toast = useToast()
  const [s, setS] = useState({ mfa: true, signup: true, maint: false })
  return (
    <>
      <PageHeader title="System settings" sub="Health and platform-wide controls." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5"><h3 className="font-semibold mb-4">System health (sample)</h3>{[['API', 'Operational'], ['Database', 'Operational'], ['Message queue', 'Operational'], ['WhatsApp provider webhooks', 'Degraded'], ['SMS provider', 'Operational']].map(([a, b]) => <div key={a} className="flex justify-between py-2.5 border-b border-ng-line last:border-0 text-sm">{a}<Badge tone={b === 'Operational' ? 'ok' : 'warn'}>{b}</Badge></div>)}</Card>
        <Card className="p-5 space-y-5"><h3 className="font-semibold">Controls</h3>{([['mfa', 'Require MFA for platform staff'], ['signup', 'Allow new organisation registrations'], ['maint', 'Maintenance mode']] as const).map(([k, l]) => <div key={k} className="flex items-center justify-between gap-4 text-sm">{l}<Toggle on={s[k]} label={l} onChange={(v) => { setS({ ...s, [k]: v }); toast(`${l}: ${v ? 'on' : 'off'}`, 'info') }} /></div>)}</Card>
      </div>
    </>
  )
}
