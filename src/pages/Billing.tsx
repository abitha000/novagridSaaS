import { useState } from 'react'
import * as I from 'lucide-react'
import { inr, industryPlanTiers } from '../data'
import { Badge, Button, Card, CardHeader, Confirm, DataTable, Meter, PageHeader, Status, Tabs, Toggle, cx, useToast } from '../ui'

const invoices = [
  { id: 'INV-1042', d: '14 May 2025', a: 47990, s: 'Paid' },
  { id: 'INV-0988', d: '14 May 2024', a: 47990, s: 'Paid' },
  { id: 'INV-0931', d: '14 Apr 2024', a: 1999, s: 'Paid' },
  { id: 'INV-1101', d: '14 Jun 2025', a: 4999, s: 'Due' },
]

export function BillingPage({ ind }: { ind: 'gym' | 'education' }) {
  const toast = useToast()
  const [tab, setTab] = useState('overview')
  const [yearly, setYearly] = useState(true)
  const [pick, setPick] = useState<string | null>(null)
  const [addons, setAddons] = useState<Record<string, boolean>>({ wl: false, msg: true, st: false })
  const tiers = industryPlanTiers[ind]
  const current = ind === 'gym' ? 'gym_growth' : 'education_growth'
  return (
    <>
      <PageHeader title="Subscription & billing" sub="Manage your industry plan, capacity and add-ons. Messaging delivery is billed separately." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'plans', label: 'Plans' }, { id: 'usage', label: 'Usage & add-ons' }, { id: 'invoices', label: 'Invoices & payments' }]} />
      <div key={tab} className="mt-6 animate-fade">
        {tab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-ng-midnight to-ng-navy-2 text-white border-0">
              <div className="flex justify-between items-start"><div><div className="text-xs uppercase tracking-widest text-ng-sky">Current plan</div><div className="text-3xl font-bold mt-2">Growth</div><div className="text-white/60 text-sm mt-1">{ind === 'gym' ? 'Gym & Fitness' : 'Education'} · Yearly billing · {inr(ind === 'gym' ? 14990 : 29990)} (proposed)</div></div><Badge tone="ok">Active</Badge></div>
              <div className="mt-8 grid sm:grid-cols-3 gap-4 text-sm">{[['Renews on', '14 Jun 2025'], ['Payment method', 'UPI autopay'], ['Grace period', '7 days after expiry']].map(([a, b]) => <div key={a}><div className="text-white/50 text-xs">{a}</div><div className="font-medium mt-1">{b}</div></div>)}</div>
              <div className="mt-6 flex gap-2 flex-wrap"><Button variant="dark" onClick={() => setTab('plans')}>Change plan</Button><Button variant="outline-dark" onClick={() => setTab('invoices')}>View invoices</Button></div>
            </Card>
            <Card className="p-5"><h3 className="font-semibold mb-4">Renewal timeline</h3>{[['Reminder email', '7 days before', 1], ['Renewal charge', '14 Jun', 0], ['Grace period', '7 days', -1], ['Read-only mode', 'After grace', -1]].map(([a, b, s]) => <div key={a as string} className="flex items-start gap-3 pb-4 last:pb-0"><span className={cx('size-5 mt-0.5 rounded-full grid place-items-center text-white', s === 1 ? 'bg-ng-ok' : s === 0 ? 'bg-ng-indigo animate-pulse-ring' : 'bg-slate-200')}>{s === 1 && <I.Check size={12} />}</span><div className="text-sm"><div className="font-medium">{a as string}</div><div className="text-ng-mute text-xs">{b as string}</div></div></div>)}</Card>
            <Card className="lg:col-span-3 p-5"><CardHeader title="Usage this period" /><div className="p-5 grid md:grid-cols-2 gap-x-10 gap-y-5"><Meter label="Staff seats" used={6} total={50} /><Meter label="Contacts" used={8420} total={10000} /><Meter label="Messages" used={6200} total={10000} /><Meter label="Storage" used={14.2} total={20} unit=" GB" /></div></Card>
          </div>
        )}
        {tab === 'plans' && (
          <>
            <div className="flex items-center gap-3 mb-5"><div className="inline-flex rounded-full border border-ng-line bg-white p-1">{[false, true].map((y) => <button key={String(y)} onClick={() => setYearly(y)} className={cx('h-9 px-5 rounded-full text-sm font-medium cursor-pointer transition', yearly === y ? 'bg-ng-indigo text-ng-midnight' : 'text-ng-mute')}>{y ? 'Yearly' : 'Monthly'}</button>)}</div>{yearly && <Badge tone="ok">About 20% saved</Badge>}</div>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">{tiers.map((p, i) => <Card key={p.key} hover className={cx('p-5 flex flex-col animate-rise', p.key === current && 'ring-2 ring-ng-midnight')} style={{ animationDelay: i * 70 + 'ms' }}><div className="flex justify-between"><h3 className="font-semibold">{p.name}</h3>{p.key === current && <Badge tone="brand">Current</Badge>}</div><div className="mt-3 text-3xl font-bold">{p.key === 'ent' ? 'Custom' : inr(yearly ? Math.round(p.y / 12) : p.m)}<span className="text-sm text-ng-mute font-normal">{p.key !== 'ent' && ' /mo'}</span></div><div className="text-xs text-ng-mute">Proposed launch price</div><ul className="mt-4 space-y-2 text-sm flex-1">{p.limits.map((l) => <li key={l} className="flex gap-2"><I.Check size={15} className="text-ng-ok mt-0.5 shrink-0" />{l}</li>)}</ul><Button className="mt-5" variant={p.key === current ? 'secondary' : 'primary'} disabled={p.key === current} onClick={() => setPick(p.key)}>{p.key === current ? 'Current plan' : p.key === 'ent' ? 'Contact sales' : tiers.findIndex((x) => x.key === p.key) > tiers.findIndex((x) => x.key === current) ? 'Upgrade' : 'Downgrade'}</Button></Card>)}</div>
            <p className="mt-4 text-sm text-ng-mute flex gap-2"><I.Info size={16} className="mt-0.5 shrink-0" />Plans change features and capacity only. Your approved industry category determines which modules are available.</p>
          </>
        )}
        {tab === 'usage' && (
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5 space-y-5"><h3 className="font-semibold">Limits</h3><Meter label="Messages" used={6200} total={10000} /><Meter label="Contacts" used={8420} total={10000} /><Meter label="Storage" used={14.2} total={20} unit=" GB" /></Card>
            <Card className="p-5"><h3 className="font-semibold mb-3">Add-ons (sample prices)</h3>{([['wl', 'White-label', 'Your logo, colours and domain', 999], ['msg', 'Additional messaging allowance', 'Provider delivery charges billed separately', 199], ['st', 'Extra 5 GB storage', 'Documents and uploads', 199]] as const).map(([k, n, d, p]) => <div key={k} className="flex items-center gap-4 py-3.5 border-b border-ng-line last:border-0"><div className="flex-1"><div className="font-medium text-sm">{n}</div><div className="text-xs text-ng-mute">{d} · {inr(p)}/mo</div></div><Toggle on={addons[k]} label={n} onChange={(v) => { setAddons({ ...addons, [k]: v }); toast(`${n} ${v ? 'added to next invoice' : 'removed'}`, 'info') }} /></div>)}</Card>
          </div>
        )}
        {tab === 'invoices' && <Card><DataTable rows={invoices} cols={[{ key: 'id', header: 'Invoice', mobile: 'title', render: (r) => <span className="font-mono text-[13px]">{r.id}</span> }, { key: 'd', header: 'Date' }, { key: 'a', header: 'Amount', render: (r) => inr(r.a) }, { key: 's', header: 'Status', render: (r) => <Status value={r.s} /> }, { key: 'x', header: '', render: (r) => <Button size="sm" variant="ghost" icon={<I.Download size={14} />} onClick={() => toast(`${r.id}.pdf downloaded`)}>PDF</Button> }]} /></Card>}
      </div>
      <Confirm open={!!pick} onClose={() => setPick(null)} title={pick === 'ent' ? 'Contact sales' : 'Change plan?'} confirmLabel={pick === 'ent' ? 'Request call' : 'Confirm change'} body={pick === 'ent' ? 'Our team will contact you about custom limits and white-label.' : <>Switch to <b>{tiers.find((p) => p.key === pick)?.name}</b>. The new capacity and features will apply after the subscription change is confirmed by the billing service.</>} onConfirm={() => toast(pick === 'ent' ? 'Request sent' : 'Plan change scheduled')} />
    </>
  )
}
