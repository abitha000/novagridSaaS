import { useCallback, useEffect, useMemo, useState } from 'react'
import * as I from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, Chips, Confirm, DataTable, EmptyState, Field, Input, Modal, PageHeader, SearchBox, Select, Status, Tabs, Textarea, Toggle, cx, useFakeLoad, useToast } from '../ui'
import { students } from '../data'
import type { Ind } from './Workspace'
import { useLiveTenant } from '../lib/auth'
import { createTemplate, listNotifications, listRecipients, listTemplates, updateDraftTemplate } from '../lib/api/notifications'
import type { NotificationRow, RecipientRow, Template } from '../lib/api/types'
import { errorMessage } from '../lib/api/errors'
import { listAllContacts, recordConsent } from '../lib/api/contacts'
import type { Contact, Channel as ApiChannel } from '../lib/api/types'

type Channel = 'WhatsApp' | 'SMS' | 'Email'
const templates = [
  { id: 't1', name: 'Route change', ch: 'WhatsApp', st: 'Approved', body: 'Hello {{name}}, the pickup for {{audience}} has changed. New first stop time: 06:40 at Andheri Station. Please be ready 5 minutes early.' },
  { id: 't2', name: 'Fee reminder', ch: 'SMS', st: 'Approved', body: 'Dear {{name}}, fee for Term 2 is due on 28 May. Pay at the accounts office or online.' },
  { id: 't3', name: 'Renewal reminder', ch: 'WhatsApp', st: 'Approved', body: 'Hi {{name}}, your membership expires soon. Renew this week to keep your plan benefits.' },
  { id: 't4', name: 'Holiday notice', ch: 'Email', st: 'Pending', body: 'Dear {{name}}, we will be closed on 15 June. Regular schedule resumes the next day.' },
  { id: 't5', name: 'Open day invite', ch: 'WhatsApp', st: 'Rejected', body: 'Join our open day! Limited seats. {{link}}' },
]
const first = ['Aditi', 'Rahul', 'Meera', 'Kunal', 'Nisha', 'Varun', 'Pooja', 'Sagar', 'Isha', 'Neel', 'Tara', 'Omkar', 'Riya', 'Arnav', 'Kavya', 'Dhruv', 'Sneha', 'Yuvraj', 'Pari', 'Harsh']
const last = ['Kulkarni', 'Shah', 'Nair', 'Reddy', 'Iyer', 'Joshi', 'Sethi', 'Bhat']
function recipientsFor(aud: string) {
  const n = aud === 'bus14' ? 21 : aud === 'class' ? 14 : aud === 'all' ? 30 : 1
  const base = students.filter((s) => s.bus === 'Bus 14')
  const studs = Array.from({ length: n }, (_, i) => (aud === 'bus14' && base[i] ? { s: base[i].name, g: base[i].guardian } : { s: `${first[i % 20]} ${last[(i * 3) % 8]}`, g: `${first[(i + 7) % 20]} ${last[(i * 3) % 8]}` }))
  return studs.flatMap((x, i) => (aud === 'single' ? [{ name: 'Rohit Bansal', role: 'Student', i }] : [{ name: x.s, role: 'Student', i: i * 2 }, { name: x.g, role: 'Parent', i: i * 2 + 1 }]))
}
const scripts: Record<string, string[]> = {
  ok: ['Queued', 'Submitted', 'Sent', 'Delivered'],
  read: ['Queued', 'Submitted', 'Sent', 'Delivered', 'Read'],
  fail: ['Queued', 'Submitted', 'Sent', 'Failed'],
  retry: ['Queued', 'Submitted', 'Failed', 'Retrying', 'Sent', 'Delivered'],
}
const kind = (i: number) => (i === 9 ? 'fail' : i === 21 ? 'fail' : i === 14 ? 'retry' : i % 3 === 0 ? 'read' : 'ok')

export function CommsPage({ ind, audience }: { ind: Ind; audience?: string }) {
  const tenantId = useLiveTenant()
  const [tab, setTab] = useState('compose')
  if (tenantId) return <LiveComms tenantId={tenantId} />
  return (
    <>
      <PageHeader title="Communications" sub="Every message is delivered individually. Recipients never see each other." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'compose', label: 'Compose' }, { id: 'history', label: 'Campaign history' }, { id: 'templates', label: 'Templates', count: templates.length }, { id: 'failed', label: 'Failed', count: 3 }, { id: 'prefs', label: 'Recipient preferences' }]} />
      <div key={tab} className="mt-6 animate-fade">
        {tab === 'compose' && <Compose ind={ind} initial={audience} />}
        {tab === 'history' && <History />}
        {tab === 'templates' && <Templates />}
        {tab === 'failed' && <Failed />}
        {tab === 'prefs' && <Prefs />}
      </div>
    </>
  )
}

function Compose({ ind, initial }: { ind: Ind; initial?: string }) {
  const toast = useToast()
  const auds = ind === 'gym'
    ? [['renew', 'Renewals due this week', 38, 'Dynamic · updates as expiry dates change'], ['trainer', 'Clients of Neha Iyer', 62, 'Dynamic · by trainer'], ['all', 'All active members', 1240, 'Everyone with consent'], ['single', 'Individual member', 1, 'Search and choose one person']]
    : [['bus14', 'Bus 14 · students and parents', 42, 'Dynamic · from bus allocation'], ['class', 'B.Tech CSE Sec A', 28, 'Students and guardians'], ['all', 'All students and guardians', 16840, 'Everyone with consent'], ['single', 'Individual student', 1, 'Search and choose one person']]
  const start = initial && auds.some((a) => a[0] === initial) ? initial : ''
  const [step, setStep] = useState(start ? 1 : 0)
  const [aud, setAud] = useState(start)
  const [ch, setCh] = useState<Channel>('WhatsApp')
  const [fallback, setFallback] = useState(true)
  const [tpl, setTpl] = useState(start === 'bus14' ? 't1' : '')
  const [body, setBody] = useState(start === 'bus14' ? templates[0].body.replace('{{audience}}', 'Bus 14') : '')
  const [when, setWhen] = useState<'now' | 'later'>('now')
  const [confirm, setConfirm] = useState(false)
  const [published, setPublished] = useState(false)
  const a = auds.find((x) => x[0] === aud)
  const recipients = useMemo(() => recipientsFor(aud || 'bus14'), [aud])
  const optedOut = aud === 'bus14' ? 2 : 0
  const label = (a?.[1] as string | undefined)?.split(' · ')[0] ?? ''
  const preview = body.replace('{{name}}', 'Ananya').replace('{{audience}}', label.replace(/ ·.*/, ''))

  if (published) return <Delivery recipients={recipients} total={a?.[2] as number} channel={ch} fallback={fallback} onDone={() => { setPublished(false); setStep(0); setAud(''); setBody(''); setTpl('') }} />
  const steps = ['Audience', 'Message', 'Review']
  return (
    <div className="grid xl:grid-cols-[1fr_340px] gap-6">
      <div>
        <ol className="flex gap-2 mb-5">{steps.map((s, i) => <li key={s} className="flex-1"><button disabled={i > step} onClick={() => setStep(i)} className={cx('w-full flex items-center gap-2 h-10 px-3 rounded-lg text-sm font-medium border cursor-pointer disabled:cursor-default', i === step ? 'bg-ng-midnight border-ng-midnight text-white' : i < step ? 'bg-white border-ng-line' : 'bg-white border-ng-line text-ng-mute')}><span className={cx('size-5 rounded-full grid place-items-center text-[11px]', i <= step ? 'bg-ng-indigo text-ng-midnight' : 'bg-slate-200')}>{i < step ? <I.Check size={12} /> : i + 1}</span><span className="hidden sm:inline">{s}</span></button></li>)}</ol>
        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-3 animate-rise">
            {auds.map(([k, l, c, d]) => <button key={k as string} onClick={() => setAud(k as string)} className={cx('text-left rounded-2xl border p-5 transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-ng-md', aud === k ? 'border-ng-midnight bg-ng-tint ring-4 ring-ng-indigo/40' : 'border-ng-line bg-white')}><div className="flex justify-between"><span className="size-10 rounded-lg bg-white text-ng-indigo-d grid place-items-center border border-ng-line">{k === 'bus14' ? <I.Bus size={19} /> : k === 'single' ? <I.User size={19} /> : <I.Users size={19} />}</span>{aud === k && <I.CircleCheck className="text-ng-indigo-d" size={20} />}</div><div className="mt-3 font-semibold">{l as string}</div><div className="text-xs text-ng-mute mt-0.5">{d as string}</div><div className="mt-3 text-sm"><b>{(c as number).toLocaleString('en-IN')}</b> <span className="text-ng-mute">recipients</span></div></button>)}
            <div className="sm:col-span-2 text-xs text-ng-mute flex gap-2 items-start"><I.ShieldCheck size={15} className="mt-0.5 text-ng-indigo-d shrink-0" />Audiences are resolved on the server. You see counts, never a shared list of phone numbers.</div>
            <div className="sm:col-span-2 flex justify-end"><Button disabled={!aud} onClick={() => setStep(1)} icon={<I.ArrowRight size={16} />}>Continue</Button></div>
          </div>
        )}
        {step === 1 && (
          <Card className="p-5 space-y-5 animate-rise">
            <Field label="Channel"><Chips<Channel> options={['WhatsApp', 'SMS', 'Email']} value={ch} onChange={setCh} /></Field>
            {ch !== 'Email' && <div className="flex items-center justify-between gap-4 text-sm rounded-lg bg-ng-canvas p-3"><span>{ch === 'WhatsApp' ? 'Fall back to SMS if WhatsApp is not available' : 'Fall back to email if SMS fails'}<span className="block text-xs text-ng-mute">Only for recipients who consented to that channel.</span></span><Toggle on={fallback} onChange={setFallback} label="Fallback" /></div>}
            <Field label="Template" hint={ch === 'WhatsApp' ? 'WhatsApp business-initiated messages must use an approved template.' : undefined}><Select value={tpl} onChange={(e) => { setTpl(e.target.value); const t = templates.find((x) => x.id === e.target.value); if (t) setBody(t.body.replace('{{audience}}', label.split(' · ')[0])) }}><option value="">Write a custom message</option>{templates.filter((t) => t.st === 'Approved').map((t) => <option key={t.id} value={t.id}>{t.name} ({t.ch})</option>)}</Select></Field>
            <Field label="Message"><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your announcement…" /></Field>
            <div className="flex flex-wrap gap-2 -mt-2 text-xs">{['{{name}}', '{{audience}}'].map((v) => <button key={v} onClick={() => setBody(body + ' ' + v)} className="rounded-md bg-ng-tint text-ng-indigo-d px-2 py-1 font-mono cursor-pointer">{v}</button>)}<span className="ml-auto text-ng-mute">{body.length} characters</span></div>
            <Field label="When to send"><Chips options={['Send now', 'Schedule']} value={when === 'now' ? 'Send now' : 'Schedule'} onChange={(v) => setWhen(v === 'Send now' ? 'now' : 'later')} /></Field>
            {when === 'later' && <Field label="Date and time"><Input type="datetime-local" defaultValue="2025-06-02T06:00" /></Field>}
            <div className="flex justify-between"><Button variant="secondary" onClick={() => setStep(0)}>Back</Button><Button disabled={body.trim().length < 10} onClick={() => setStep(2)}>Preview</Button></div>
          </Card>
        )}
        {step === 2 && (
          <Card className="p-5 animate-rise">
            <h3 className="font-semibold">Review before publishing</h3>
            <dl className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">{[['Audience', label], ['Recipients', `${(a?.[2] as number).toLocaleString('en-IN')} individual messages`], ['Channel', ch + (fallback && ch !== 'Email' ? ' + fallback' : '')], ['Delivery', when === 'now' ? 'Immediately' : 'Scheduled · 2 Jun, 06:00']].map(([x, y]) => <div key={x}><dt className="text-xs uppercase tracking-wide text-ng-mute">{x}</dt><dd className="font-medium mt-1">{y}</dd></div>)}</dl>
            {optedOut > 0 && <div className="mt-5 rounded-lg bg-amber-50 text-amber-800 text-sm p-3 flex gap-2"><I.TriangleAlert size={16} className="mt-0.5 shrink-0" />{optedOut} recipients are excluded because they opted out of this channel.</div>}
            <div className="mt-5 rounded-lg bg-ng-canvas p-3 text-sm flex gap-2"><I.Lock size={16} className="mt-0.5 text-ng-indigo-d shrink-0" />Each person gets a private message. Nobody sees another recipient's number.</div>
            <div className="mt-6 flex justify-between"><Button variant="secondary" onClick={() => setStep(1)}>Edit</Button><Button icon={<I.Send size={16} />} onClick={() => setConfirm(true)}>{when === 'now' ? 'Publish' : 'Schedule'} to {(a?.[2] as number)}</Button></div>
          </Card>
        )}
      </div>
      <div className="xl:sticky xl:top-24 self-start">
        <div className="rounded-[2rem] bg-ng-midnight p-2.5 shadow-ng-lg max-w-[320px] mx-auto w-full"><div className="rounded-[1.5rem] bg-[#E9EEF3] overflow-hidden min-h-[360px]"><div className="bg-ng-navy-2 text-white px-4 py-3 flex items-center gap-3 text-sm"><Avatar name="St Xavier" size={30} /><div><div className="font-medium leading-tight">St. Xavier Institute</div><div className="text-[11px] text-white/50">{ch} · private chat</div></div></div><div className="p-4">{preview.trim() ? <div className="animate-pop max-w-[88%] rounded-2xl rounded-tl-sm bg-white p-3 text-[13px] leading-relaxed shadow-sm">{preview}<div className="text-[10px] text-ng-mute text-right mt-1.5">06:00</div></div> : <div className="text-center text-xs text-ng-mute pt-24">Your message preview appears here</div>}</div></div></div>
        <p className="text-center text-xs text-ng-mute mt-3">Preview for “Ananya”. Variables personalise each message.</p>
      </div>
      <Confirm open={confirm} onClose={() => setConfirm(false)} title="Publish announcement?" confirmLabel="Publish" body={<>This sends <b>{a?.[2] as number}</b> separate {ch} messages to {label}. You cannot recall messages once submitted.</>} onConfirm={() => { setPublished(true); toast('Announcement queued for delivery', 'info') }} />
    </div>
  )
}

function Delivery({ recipients, total, channel, fallback, onDone }: { recipients: ReturnType<typeof recipientsFor>; total: number; channel: Channel; fallback: boolean; onDone: () => void }) {
  const [t, setT] = useState(0)
  useEffect(() => { if (t > 16) return; const id = setTimeout(() => setT(t + 1), 650); return () => clearTimeout(id) }, [t])
  const rows = recipients.map((r) => { const s = scripts[kind(r.i)]; const st = s[Math.min(Math.max(t - (r.i % 6), 0), s.length - 1)]; return { id: r.i, ...r, st } })
  const count = (k: string) => rows.filter((r) => r.st === k).length
  const done = t > 16
  const failed = count('Failed')
  return (
    <div className="space-y-4 animate-rise">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3 justify-between"><div className="flex items-center gap-3"><span className={cx('size-11 rounded-xl grid place-items-center', done ? 'bg-emerald-50 text-ng-ok' : 'bg-ng-midnight text-ng-lime')}>{done ? <I.CheckCheck /> : <I.Loader className="animate-spin" />}</span><div><div className="font-semibold">{done ? 'Delivery complete' : 'Delivering…'}</div><div className="text-xs text-ng-mute">{channel} · {rows.length} sample recipients shown of {total} · statuses update from provider callbacks</div></div></div><Button variant="secondary" onClick={onDone}>Back to compose</Button></div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">{['Queued', 'Sent', 'Delivered', 'Read', 'Failed'].map((k) => <div key={k} className="rounded-xl bg-ng-canvas py-3"><div className="text-2xl font-bold">{count(k) + (k === 'Sent' ? count('Submitted') : 0)}</div><div className="text-xs text-ng-mute mt-0.5">{k === 'Sent' ? 'Submitted / sent' : k}</div></div>)}</div>
        <div className="mt-4 h-2 rounded-full bg-ng-tint overflow-hidden"><div className="h-full bg-gradient-to-r bg-ng-midnight transition-all duration-500" style={{ width: `${((count('Delivered') + count('Read') + failed) / rows.length) * 100}%` }} /></div>
        <p className="mt-3 text-xs text-ng-mute flex gap-2"><I.Info size={14} className="shrink-0 mt-0.5" />“Submitted” means the provider accepted the request. A message is only “Delivered” after a delivery callback.</p>
      </Card>
      {failed > 0 && <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm p-4 flex gap-3 animate-pop"><I.CircleAlert size={18} className="shrink-0 mt-0.5" /><div><b>{failed} messages failed permanently.</b> Reason: number not registered on WhatsApp. {fallback ? 'SMS fallback was attempted where consent exists.' : 'Enable fallback to reach them by SMS.'}</div></div>}
      <Card><DataTable rows={rows.slice(0, 14)} cols={[{ key: 'name', header: 'Recipient', mobile: 'title', render: (r) => <div className="flex items-center gap-3"><Avatar name={r.name} size={28} /><span className="font-medium">{r.name}</span></div> }, { key: 'role', header: 'Role' }, { key: 'ph', header: 'Phone', render: (r) => <span className="font-mono text-xs text-ng-mute">+91 ••••• ••{(r.i * 37) % 90 + 10}</span> }, { key: 'st', header: 'Status', render: (r) => <Status value={r.st} /> }]} /></Card>
    </div>
  )
}

function History() {
  const loading = useFakeLoad(500)
  const rows = [{ id: 1, n: 'Bus 14 route change', ch: 'WhatsApp', r: 42, d: '98%', s: 'Delivered', w: 'Today, 06:00' }, { id: 2, n: 'Term 2 fee reminder', ch: 'SMS', r: 312, d: '96%', s: 'Delivered', w: 'Yesterday' }, { id: 3, n: 'Holiday notice', ch: 'Email', r: 16840, d: '—', s: 'Scheduled', w: '15 Jun, 08:00' }, { id: 4, n: 'Exam hall tickets', ch: 'WhatsApp', r: 240, d: '71%', s: 'Retrying', w: '2 days ago' }]
  return <Card><DataTable loading={loading} rows={rows} cols={[{ key: 'n', header: 'Campaign', mobile: 'title', render: (r) => <span className="font-medium">{r.n}</span> }, { key: 'ch', header: 'Channel' }, { key: 'r', header: 'Recipients', render: (r) => r.r.toLocaleString('en-IN') }, { key: 'd', header: 'Delivered' }, { key: 's', header: 'Status', render: (r) => <Status value={r.s} /> }, { key: 'w', header: 'When' }]} /></Card>
}

function Templates() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="flex justify-between items-center mb-4"><p className="text-sm text-ng-mute">WhatsApp and SMS templates need provider approval (and DLT registration for SMS in India).</p><Button icon={<I.Plus size={16} />} onClick={() => setOpen(true)}>New template</Button></div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{templates.map((t, i) => <Card key={t.id} hover className="p-5 animate-rise" style={{ animationDelay: i * 60 + 'ms' }}><div className="flex justify-between"><div className="font-semibold">{t.name}</div><Status value={t.st} /></div><Badge tone="neutral" dot={false}>{t.ch}</Badge><p className="mt-3 text-sm text-ng-mute line-clamp-4">{t.body}</p>{t.st === 'Rejected' && <p className="mt-3 text-xs text-ng-err">Rejected: contains a promotional link without opt-in context.</p>}</Card>)}</div>
      <Modal open={open} onClose={() => setOpen(false)} title="New template" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => { setOpen(false); toast('Template submitted for approval', 'info') }}>Submit for approval</Button></>}><div className="space-y-4"><Field label="Name"><Input /></Field><Field label="Channel"><Select><option>WhatsApp</option><option>SMS</option><option>Email</option></Select></Field><Field label="Body"><Textarea rows={4} placeholder="Hello {{name}}, …" /></Field></div></Modal>
    </>
  )
}

function Failed() {
  const toast = useToast()
  const [rows, setRows] = useState([{ id: 1, n: 'Pranab Das (parent)', r: 'Number not registered on WhatsApp', c: 'Bus 14 route change', p: 'Permanent' }, { id: 2, n: 'Alka Bansal (parent)', r: 'Provider timeout after 3 attempts', c: 'Exam hall tickets', p: 'Retry exhausted' }, { id: 3, n: 'Sunita Malhotra (parent)', r: 'Recipient opted out', c: 'Term 2 fee reminder', p: 'Blocked' }])
  if (!rows.length) return <Card><EmptyState icon={<I.CheckCheck size={26} />} title="No failed messages" body="Everything submitted has been delivered or is still in progress." /></Card>
  return <Card><DataTable rows={rows} cols={[{ key: 'n', header: 'Recipient', mobile: 'title', render: (r) => <span className="font-medium">{r.n}</span> }, { key: 'r', header: 'Reason' }, { key: 'c', header: 'Campaign' }, { key: 'p', header: 'Type', render: (r) => <Badge tone={r.p === 'Blocked' ? 'neutral' : 'err'}>{r.p}</Badge> }, { key: 'a', header: '', render: (r) => (r.p === 'Blocked' ? null : <Button size="sm" variant="secondary" onClick={() => { setRows(rows.filter((x) => x.id !== r.id)); toast('Queued for retry') }}>Retry</Button>) }]} /></Card>
}

function Prefs() {
  const [q, setQ] = useState('')
  const [p, setP] = useState<Record<string, boolean>>({})
  const list = students.map((s) => s.guardian).filter((n) => n.toLowerCase().includes(q.toLowerCase()))
  return (
    <Card><div className="p-4 border-b border-ng-line flex flex-col sm:flex-row gap-3 justify-between"><SearchBox value={q} onChange={setQ} placeholder="Search recipient" className="sm:w-72" /><span className="text-xs text-ng-mute self-center">Changes are recorded in the consent ledger with source and time.</span></div>
      {list.length === 0 ? <EmptyState title="No recipients found" body="Try another name." /> : <div className="divide-y divide-ng-line">{list.map((n) => <div key={n} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"><div className="flex items-center gap-3 flex-1"><Avatar name={n} /><span className="font-medium">{n}</span></div><div className="flex gap-5">{['WhatsApp', 'SMS', 'Email'].map((c) => { const k = n + c; const on = p[k] ?? !(n === 'Sunita Malhotra' && c !== 'Email'); return <label key={c} className="flex items-center gap-2 text-sm text-ng-mute">{c}<Toggle on={on} label={`${c} for ${n}`} onChange={(v) => setP({ ...p, [k]: v })} /></label> })}</div></div>)}</div>}
    </Card>
  )
}


/* ---------------- Communications (live, tenant-scoped; no dispatch) ---------------- */
function LiveComms({ tenantId }: { tenantId: string }) {
  const [tab, setTab] = useState('history')
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null)
  const [templatesLive, setTemplatesLive] = useState<Template[] | null>(null)
  const [failed, setFailed] = useState<RecipientRow[] | null>(null)
  const [selected, setSelected] = useState<NotificationRow | null>(null)
  const [recipients, setRecipients] = useState<RecipientRow[] | null>(null)
  const [error, setError] = useState('')
  const [templateOpen, setTemplateOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<{ name: string; channel: 'whatsapp' | 'sms' | 'email'; body: string; dlt_template_id: string }>({ name: '', channel: 'whatsapp', body: '', dlt_template_id: '' })
  const toast = useToast()

  const load = useCallback(async () => {
    setError('')
    try {
      const [n, t] = await Promise.all([listNotifications(tenantId), listTemplates(tenantId)])
      setNotifications(n)
      setTemplatesLive(t)
      const recipientSets = await Promise.all(n.map((row) => listRecipients(row.id)))
      setFailed(recipientSets.flat().filter((r) => r.status === 'failed'))
    } catch (e) {
      setError(errorMessage(e))
      setNotifications([])
      setTemplatesLive([])
      setFailed([])
    }
  }, [tenantId])
  useEffect(() => { void load() }, [load])

  const openDetails = async (row: NotificationRow) => {
    setSelected(row)
    setRecipients(null)
    try { setRecipients(await listRecipients(row.id)) }
    catch (e) { toast(errorMessage(e), 'err'); setRecipients([]) }
  }
  const saveTemplate = async () => {
    setSaving(true)
    try {
      if (editingTemplate) await updateDraftTemplate(tenantId, editingTemplate.id, { ...draft, dlt_template_id: draft.dlt_template_id || undefined })
      else await createTemplate(tenantId, { ...draft, dlt_template_id: draft.dlt_template_id || undefined })
      toast(editingTemplate ? 'Draft template updated' : 'Draft template saved')
      setTemplateOpen(false)
      setEditingTemplate(null)
      setDraft({ name: '', channel: 'whatsapp', body: '', dlt_template_id: '' })
      const rows = await listTemplates(tenantId)
      setTemplatesLive(rows)
    } catch (e) { toast(errorMessage(e), 'err') }
    finally { setSaving(false) }
  }
  const moneylessCount = (status: string) => (notifications ?? []).filter(n => n.status === status).length

  return <>
    <PageHeader title="Communications" sub="Live tenant-scoped campaign history and message templates. Dispatch is not enabled in this screen." actions={<Button variant="secondary" icon={<I.RefreshCw size={15}/>} onClick={() => void load()}>Refresh</Button>} />
    <Tabs value={tab} onChange={setTab} tabs={[{ id: 'history', label: 'Campaign history', count: notifications?.length ?? 0 }, { id: 'templates', label: 'Templates', count: templatesLive?.length ?? 0 }, { id: 'failed', label: 'Failed recipients', count: failed?.length ?? 0 }, { id: 'prefs', label: 'Recipient preferences' }]} />
    {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm p-4">{error}</div>}
    {tab === 'history' && <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['queued','scheduled','completed','failed'] as const).map((s) => <Card key={s} className="p-4"><div className="text-xs text-ng-mute capitalize">{s}</div><div className="text-2xl font-bold tabular-nums">{moneylessCount(s)}</div></Card>)}
      </div>
      <Card><DataTable loading={notifications === null} rows={notifications ?? []} empty={<EmptyState title="No campaigns yet" body="Campaign records will appear here when a campaign is created through an approved dispatch workflow."/>} cols={[
        {key:'title',header:'Campaign',mobile:'title',render:r=><button className="font-medium text-left hover:underline cursor-pointer" onClick={() => void openDetails(r)}>{r.title}</button>},
        {key:'channel',header:'Channel',render:r=>r.channel.toUpperCase()},
        {key:'recipients',header:'Recipients',render:r=>r.recipient_count.toLocaleString('en-IN')},
        {key:'status',header:'Status',render:r=><Status value={r.status}/>},
        {key:'date',header:'Created',render:r=>new Date(r.created_at).toLocaleString('en-IN')},
        {key:'details',header:'',render:r=><Button size="sm" variant="secondary" onClick={() => void openDetails(r)}>Details</Button>}
      ]}/></Card>
    </div>}
    {tab === 'templates' && <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ng-mute">Templates are stored as drafts until provider approval. Saving a template does not send a message.</p><Button icon={<I.Plus size={16}/>} onClick={() => {setEditingTemplate(null);setDraft({name:"",channel:"whatsapp",body:"",dlt_template_id:""});setTemplateOpen(true)}}>New draft template</Button></div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(templatesLive ?? []).map(t => <Card key={t.id} className="p-5"><div className="flex justify-between gap-2"><b>{t.name}</b><Status value={t.provider_status}/></div><Badge tone="neutral" dot={false}>{t.channel.toUpperCase()}</Badge><p className="mt-3 text-sm text-ng-mute whitespace-pre-wrap">{t.body}</p>{t.dlt_template_id && <p className="mt-3 text-xs text-ng-mute">DLT ID: {t.dlt_template_id}</p>}{t.provider_status === 'draft' && <div className="mt-4"><Button size="sm" variant="secondary" onClick={() => {setEditingTemplate(t);setDraft({name:t.name,channel:t.channel,body:t.body,dlt_template_id:t.dlt_template_id??''});setTemplateOpen(true)}}>Edit draft</Button></div>}</Card>)}
        {templatesLive?.length === 0 && <Card className="md:col-span-2 xl:col-span-3"><EmptyState title="No templates yet" body="Create a draft template to begin your organisation's template library."/></Card>}
      </div>
    </div>}
    {tab === 'prefs' && <div className="mt-5"><LiveRecipientPreferences tenantId={tenantId}/></div>}
    {tab === 'failed' && <div className="mt-5"><Card><DataTable loading={failed === null} rows={failed ?? []} empty={<EmptyState title="No failed recipients" body="There are no failed recipients in the latest 50 campaign records."/>} cols={[
      {key:'person',header:'Recipient',mobile:'title',render:r=><span className="font-medium">{r.contact?.full_name ?? 'Contact'}</span>},
      {key:'channel',header:'Channel',render:r=>r.channel.toUpperCase()},
      {key:'reason',header:'Reason',render:r=>r.error_code ?? r.skip_reason ?? 'Not provided'},
      {key:'attempts',header:'Attempts',render:r=>r.attempts},
      {key:'permanent',header:'Failure',render:r=><Status value={r.is_permanent ? 'Permanent' : 'Retryable'}/>}
    ]}/></Card></div>}
    <Modal open={templateOpen} onClose={() => setTemplateOpen(false)} title={editingTemplate ? "Edit draft template" : "Create draft template"} footer={<><Button variant="secondary" onClick={() => setTemplateOpen(false)}>Cancel</Button><Button loading={saving} disabled={draft.name.trim().length < 2 || draft.body.trim().length < 5} onClick={() => void saveTemplate()}>{editingTemplate ? "Save changes" : "Save draft"}</Button></>}>
      <div className="space-y-4">
        <Field label="Template name"><Input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></Field>
        <Field label="Channel"><Select value={draft.channel} onChange={e=>setDraft({...draft,channel:e.target.value as typeof draft.channel})}><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">Email</option></Select></Field>
        <Field label="Message body"><Textarea rows={5} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})} placeholder="Hello {{name}}, …"/></Field>
        {draft.channel === 'sms' && <Field label="DLT template ID (optional)"><Input value={draft.dlt_template_id} onChange={e=>setDraft({...draft,dlt_template_id:e.target.value})}/></Field>}
      </div>
    </Modal>
    <Modal open={!!selected} onClose={() => {setSelected(null);setRecipients(null)}} title={selected?.title ?? 'Campaign details'}>
      {selected && <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-ng-mute block text-xs">Channel</span>{selected.channel.toUpperCase()}</div><div><span className="text-ng-mute block text-xs">Status</span><Status value={selected.status}/></div><div><span className="text-ng-mute block text-xs">Recipients</span>{selected.recipient_count}</div><div><span className="text-ng-mute block text-xs">Created</span>{new Date(selected.created_at).toLocaleString('en-IN')}</div></div>
        <div className="rounded-xl bg-ng-canvas p-3 text-sm whitespace-pre-wrap">{selected.body}</div>
        <h4 className="font-semibold text-sm">Recipient status</h4>
        <DataTable loading={recipients === null} rows={recipients ?? []} empty={<EmptyState title="No recipient records" body="No recipients are associated with this campaign."/>} cols={[
          {key:'name',header:'Recipient',mobile:'title',render:r=>r.contact?.full_name ?? 'Contact'},
          {key:'channel',header:'Channel',render:r=>r.channel.toUpperCase()},
          {key:'status',header:'Status',render:r=><Status value={r.status}/>},
          {key:'updated',header:'Updated',render:r=>new Date(r.updated_at).toLocaleString('en-IN')}
        ]}/>
      </div>}
    </Modal>
  </>
}


/* ---------------- Live consent preferences ---------------- */
function LiveRecipientPreferences({ tenantId }: { tenantId: string }) {
  const [contacts, setContacts] = useState<Contact[] | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const toast = useToast()

  const load = useCallback(async () => {
    setError('')
    try { setContacts(await listAllContacts(tenantId)) }
    catch (e) { setError(errorMessage(e)); setContacts([]) }
  }, [tenantId])
  useEffect(() => { void load() }, [load])

  const filtered = (contacts ?? []).filter(c => [c.full_name, c.email ?? '', c.phone_e164 ?? ''].some(v => v.toLowerCase().includes(query.toLowerCase())))
  const consent = (contact: Contact, channel: ApiChannel) => contact.communication_preferences?.find(p => p.channel === channel)?.consent_status ?? 'unknown'
  const change = async (contact: Contact, channel: ApiChannel, enabled: boolean) => {
    const key = contact.id + ':' + channel
    setBusy(key)
    try {
      await recordConsent(tenantId, contact.id, channel, enabled ? 'opted_in' : 'opted_out', 'Recorded by workspace user')
      toast(enabled ? 'Consent recorded' : 'Opt-out recorded')
      await load()
    } catch (e) { toast(errorMessage(e), 'err') }
    finally { setBusy(null) }
  }

  return <Card>
    <div className="p-4 border-b border-ng-line flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
      <div><b className="text-sm">Communication consent</b><p className="text-xs text-ng-mute mt-1">Only explicit opt-in is treated as permission to message. Unknown consent remains off.</p></div>
      <SearchBox value={query} onChange={setQuery} placeholder="Search name, email or phone" className="sm:w-72"/>
    </div>
    {error && <div className="p-4 text-sm text-red-700">{error} <Button size="sm" variant="secondary" onClick={() => void load()}>Retry</Button></div>}
    {contacts === null ? <div className="p-6 text-sm text-ng-mute">Loading tenant contacts…</div> : filtered.length === 0 ? <EmptyState title="No contacts found" body={query ? "Try a different search." : "Add contacts before managing communication consent."}/> : <div className="divide-y divide-ng-line">
      {filtered.map(contact => <div key={contact.id} className="p-4 flex flex-col xl:flex-row xl:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0"><Avatar name={contact.full_name}/><div className="min-w-0"><div className="font-medium truncate">{contact.full_name}</div><div className="text-xs text-ng-mute truncate">{contact.email || contact.phone_e164 || contact.type}</div></div></div>
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          {(['whatsapp','sms','email'] as ApiChannel[]).map(channel => {
            const status = consent(contact, channel)
            const key = contact.id + ':' + channel
            return <div key={channel} className="min-w-[82px]">
              <div className="text-xs text-ng-mute mb-1 capitalize">{channel}</div>
              <div className="flex items-center gap-2"><Toggle on={status === 'opted_in'} disabled={busy === key} label={channel + ' consent for ' + contact.full_name} onChange={value => void change(contact, channel, value)}/><span className="text-[11px] text-ng-mute">{status === 'opted_in' ? 'Opted in' : status === 'opted_out' ? 'Opted out' : 'Unknown'}</span></div>
            </div>
          })}
        </div>
      </div>)}
    </div>}
    <div className="px-4 py-3 border-t border-ng-line text-xs text-ng-mute">{filtered.length.toLocaleString('en-IN')} of {(contacts ?? []).length.toLocaleString('en-IN')} contacts · consent changes are written through the audited record_consent function.</div>
  </Card>
}
