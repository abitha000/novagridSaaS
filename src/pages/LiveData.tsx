import { useCallback, useEffect, useState } from 'react'
import * as I from 'lucide-react'
import { Avatar, Badge, Button, Card, Confirm, DataTable, Dropdown, EmptyState, ErrorState, Field, Input, Modal, PageHeader, SearchBox, Select, Status, useToast } from '../ui'
import { BackendError, errorMessage } from '../lib/api/errors'
import { changeStaffRole, inviteStaff, listAssignableRoles, listStaff, setStaffStatus } from '../lib/api/staff'
import { archiveContact, createContact, createContacts, listAllContacts, listContacts, recordConsent } from '../lib/api/contacts'
import { contactsToCsv, parseContactsCsv, type CsvContactRow } from '../lib/csv'
import type { Channel, Contact, StaffMember } from '../lib/api/types'
import { createGymMembership, listGymMemberships, setGymMembershipStatus, type GymMembership } from '../lib/api/gym'
import { createPayment, listPayments, type PaymentRecord } from '../lib/api/payments'
import { listGymMembershipPlans, saveGymMembershipPlan, setGymMembershipPlanActive, type GymMembershipPlan } from '../lib/api/gym-membership-plans'
import { listGymAttendance, saveGymAttendance, type GymAttendanceStatus } from '../lib/api/gym-attendance'
import { createGymTrainer, listGymTrainers, setGymTrainerStatus, type GymTrainer } from '../lib/api/gym-trainers'
import { createGymTrainingSession, listGymTrainingSessions, setGymTrainingSessionStatus, type GymTrainingSession } from '../lib/api/gym-training-sessions'
import { createTrainerTimeOff, deleteTrainerTimeOff, listTrainerAvailability, listTrainerTimeOff, saveTrainerAvailability, type TrainerAvailability, type TrainerTimeOff } from '../lib/api/gym-trainer-availability'

const SchemaNote = ({ e }: { e: unknown }) =>
  e instanceof BackendError && e.kind === 'schema_missing' ? (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm p-4 flex gap-2"><I.TriangleAlert size={18} className="shrink-0 mt-0.5" />{e.message}</div>
  ) : null

/* ---------------- Staff (live) ---------------- */
export function LiveStaff({ tenantId }: { tenantId: string }) {
  const toast = useToast()
  const [rows, setRows] = useState<StaffMember[] | null>(null)
  const [roles, setRoles] = useState<{ id: string; key: string; name: string }[]>([])
  const [err, setErr] = useState<unknown>(null)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [roleKey, setRoleKey] = useState('operator')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    setErr(null)
    Promise.all([listStaff(tenantId), listAssignableRoles()]).then(([s, r]) => { setRows(s); setRoles(r) }).catch((e) => { setErr(e); setRows([]) })
  }, [tenantId])
  useEffect(load, [load])

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast(ok); load() } catch (e) { toast(errorMessage(e), 'err') }
  }
  return (
    <>
      <PageHeader title="Staff" sub="Live data from your Supabase project." actions={<Button icon={<I.UserPlus size={16} />} onClick={() => setOpen(true)}>Invite staff</Button>} />
      <SchemaNote e={err} />
      <Card>
        {err && !(err instanceof BackendError && err.kind === 'schema_missing') ? <ErrorState onRetry={load} body={errorMessage(err)} /> : (
          <DataTable loading={rows === null} rows={rows ?? []} empty={<EmptyState title="No staff yet" body="Invite your first team member." />} cols={[
            { key: 'n', header: 'Name', mobile: 'title', render: (r) => <div className="flex items-center gap-3"><Avatar name={r.full_name ?? r.email ?? '?'} /><div><div className="font-medium">{r.full_name ?? '—'}</div><div className="text-xs text-ng-mute">{r.email}</div></div></div> },
            { key: 'r', header: 'Role', render: (r) => r.role?.key === 'owner' ? <Badge tone="brand" dot={false}>{r.role.name}</Badge> : (
              <Select aria-label="Role" className="!h-8 !w-44 !text-[13px]" value={r.role?.id ?? ''} onChange={(e) => act(() => changeStaffRole(r.id, e.target.value), 'Role updated')}>{roles.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>) },
            { key: 's', header: 'Status', render: (r) => <Status value={r.status === 'active' ? 'Active' : r.status === 'invited' ? 'Pending' : 'Suspended'} /> },
            { key: 'a', header: '', mobile: 'hide', render: (r) => r.role?.key === 'owner' ? null : <Dropdown label="Staff actions" trigger={<span className="size-8 grid place-items-center rounded-lg hover:bg-ng-tint"><I.MoreHorizontal size={18} /></span>} items={[r.status === 'disabled' ? { label: 'Re-enable', icon: <I.RotateCcw size={16} />, onClick: () => act(() => setStaffStatus(r.id, 'active'), 'Staff re-enabled') } : { label: 'Disable access', icon: <I.Ban size={16} />, danger: true, onClick: () => act(() => setStaffStatus(r.id, 'disabled'), 'Access disabled') }]} /> },
          ]} />
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Invite staff member" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={busy} disabled={!/^\S+@\S+\.\S+$/.test(email)} onClick={async () => { setBusy(true); try { await inviteStaff(tenantId, email, roleKey); toast('Invitation sent'); setOpen(false); setEmail(''); load() } catch (e) { toast(errorMessage(e), 'err') } finally { setBusy(false) } }}>Send invite</Button></>}>
        <div className="space-y-4"><Field label="Work email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field><Field label="Role" hint="The invitation is sent by a server function; the browser never holds admin keys."><Select value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>{roles.map((r) => <option key={r.id} value={r.key}>{r.name}</option>)}</Select></Field></div>
      </Modal>
    </>
  )
}

/* ---------------- Contacts (live) ---------------- */
const mask = (p: string | null) => (p ? p.slice(0, 3) + ' ••••• ••' + p.slice(-2) : '—')
export function LivePeople({ tenantId }: { tenantId: string }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<{ rows: Contact[]; total: number } | null>(null)
  const [err, setErr] = useState<unknown>(null)
  const [add, setAdd] = useState(false)
  const [form, setForm] = useState({ type: 'member', full_name: '', phone_e164: '', email: '' })
  const [del, setDel] = useState<Contact | null>(null)
  const [busy, setBusy] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<CsvContactRow[]>([])
  const [importError, setImportError] = useState('')
  const [exporting, setExporting] = useState(false)
  const load = useCallback(() => {
    setErr(null)
    listContacts(tenantId, { search: q, page }).then(setData).catch((e) => { setErr(e); setData({ rows: [], total: 0 }) })
  }, [tenantId, q, page])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); load() } catch (e) { toast(errorMessage(e), 'err') } }
  const consent = (c: Contact, ch: Channel) => c.communication_preferences?.find((p) => p.channel === ch)?.consent_status ?? 'unknown'
  return (
    <>
      <PageHeader title="People" sub="Contacts never receive an account. Phone numbers are masked." actions={<><Button variant="secondary" icon={<I.Download size={16} />} loading={exporting} onClick={async () => { setExporting(true); try { const rows = await listAllContacts(tenantId); const blob = new Blob([contactsToCsv(rows)], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'novagrid-contacts.csv'; link.click(); URL.revokeObjectURL(url); toast(`Exported ${rows.length} contacts`) } catch (e) { toast(errorMessage(e), 'err') } finally { setExporting(false) } }}>Export CSV</Button><Button variant="secondary" icon={<I.Upload size={16} />} onClick={() => { setImportRows([]); setImportError(''); setImportOpen(true) }}>Import CSV</Button><Button icon={<I.UserPlus size={16} />} onClick={() => setAdd(true)}>Add person</Button></>} />
      <SchemaNote e={err} />
      <Card>
        <div className="p-4 border-b border-ng-line"><SearchBox value={q} onChange={(v) => { setPage(0); setQ(v) }} placeholder="Search name, email or phone" className="md:w-80" /></div>
        {err && !(err instanceof BackendError && err.kind === 'schema_missing') ? <ErrorState onRetry={load} body={errorMessage(err)} /> : (
          <>
            <DataTable loading={data === null} rows={data?.rows ?? []} empty={<EmptyState title="No contacts yet" body="Add a person to start building your directory." action={<Button onClick={() => setAdd(true)}>Add person</Button>} />} cols={[
              { key: 'n', header: 'Name', mobile: 'title', render: (r) => <div className="flex items-center gap-3"><Avatar name={r.full_name} /><span className="font-medium">{r.full_name}</span></div> },
              { key: 'type', header: 'Type' },
              { key: 'p', header: 'Phone', render: (r) => <span className="font-mono text-xs text-ng-mute">{mask(r.phone_e164)}</span> },
              { key: 'c', header: 'WhatsApp consent', render: (r) => <Status value={consent(r, 'whatsapp') === 'opted_in' ? 'Opted in' : consent(r, 'whatsapp') === 'opted_out' ? 'Opted out' : 'Pending'} /> },
              { key: 'a', header: '', mobile: 'hide', render: (r) => <Dropdown label={`Actions for ${r.full_name}`} trigger={<span className="size-8 grid place-items-center rounded-lg hover:bg-ng-tint"><I.MoreHorizontal size={18} /></span>} items={[
                { label: 'Record WhatsApp opt-in', icon: <I.BadgeCheck size={16} />, onClick: () => act(() => recordConsent(tenantId, r.id, 'whatsapp', 'opted_in', 'Recorded by staff'), 'Consent recorded') },
                { label: 'Record WhatsApp opt-out', icon: <I.BellOff size={16} />, onClick: () => act(() => recordConsent(tenantId, r.id, 'whatsapp', 'opted_out', 'Recorded by staff'), 'Opt-out recorded') },
                { divider: true, label: '' }, { label: 'Archive', icon: <I.Archive size={16} />, danger: true, onClick: () => setDel(r) }]} /> },
            ]} />
            {data && data.total > 25 && <div className="flex items-center justify-between p-4 border-t border-ng-line text-sm text-ng-mute"><span>{page * 25 + 1}–{Math.min(data.total, page * 25 + 25)} of {data.total}</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={(page + 1) * 25 >= data.total} onClick={() => setPage(page + 1)}>Next</Button></div></div>}
          </>
        )}
      </Card>
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import contacts from CSV" footer={<><Button variant="secondary" onClick={() => setImportOpen(false)}>Cancel</Button><Button loading={busy} disabled={!importRows.length || importRows.some((row) => row.errors.length > 0)} onClick={async () => { setBusy(true); try { const count = await createContacts(tenantId, importRows); toast(`Imported ${count} contacts`); setImportOpen(false); setImportRows([]); setPage(0); load() } catch (e) { toast(errorMessage(e), 'err') } finally { setBusy(false) } }}>Import {importRows.length} contacts</Button></>}>
        <div className="space-y-3">
          <p className="text-sm text-ng-mute">Choose a CSV file with a <code>full_name</code> column and optional <code>type</code>, <code>phone_e164</code>, and <code>email</code> columns. Phones must use international format. Import does not grant messaging consent.</p>
          <input type="file" accept=".csv,text/csv" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ng-tint file:px-3 file:py-2 file:font-medium" onChange={async (event) => { const file = event.target.files?.[0]; setImportRows([]); setImportError(''); if (!file) return; if (file.size > 2 * 1024 * 1024) { setImportError('CSV must be 2 MB or smaller.'); return } try { setImportRows(parseContactsCsv(await file.text())) } catch (e) { setImportError(errorMessage(e)) } }} />
          {importError && <p className="text-sm text-red-600">{importError}</p>}
          {importRows.length > 0 && <div className="rounded-xl border border-ng-line p-3 space-y-2"><div className="text-sm font-semibold">{importRows.length} rows found · {importRows.filter((row) => row.errors.length === 0).length} valid · {importRows.filter((row) => row.errors.length > 0).length} need correction</div><div className="max-h-48 overflow-auto text-xs space-y-1">{importRows.slice(0, 8).map((row) => <div key={row.rowNumber} className="flex justify-between gap-3"><span>Row {row.rowNumber}: {row.full_name || 'Missing name'}</span><span className={row.errors.length ? 'text-red-600' : 'text-emerald-700'}>{row.errors.join('; ') || 'Ready'}</span></div>)}</div>{importRows.length > 8 && <p className="text-xs text-ng-mute">Showing first 8 rows.</p>}</div>}
        </div>
      </Modal>
      <Modal open={add} onClose={() => setAdd(false)} title="Add person" footer={<><Button variant="secondary" onClick={() => setAdd(false)}>Cancel</Button><Button loading={busy} onClick={async () => { setBusy(true); try { await createContact(tenantId, form); toast('Person added. Record consent before messaging.'); setAdd(false); setForm({ type: 'member', full_name: '', phone_e164: '', email: '' }); load() } catch (e) { toast(errorMessage(e), 'err') } finally { setBusy(false) } }}>Add person</Button></>}>
        <div className="space-y-4"><Field label="Full name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field><Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['member', 'student', 'parent', 'patient', 'guest', 'person'].map((t) => <option key={t}>{t}</option>)}</Select></Field><Field label="Mobile (international format)" hint="e.g. +919876543210"><Input value={form.phone_e164} onChange={(e) => setForm({ ...form, phone_e164: e.target.value.replace(/[\s-]/g, '') })} /></Field><Field label="Email (optional)"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field></div>
      </Modal>
      <Confirm danger open={!!del} onClose={() => setDel(null)} title={`Archive ${del?.full_name}?`} confirmLabel="Archive" body="The contact is hidden and excluded from future messages. Message history and consent records are kept." onConfirm={() => act(() => archiveContact(del!.id), 'Contact archived')} />
    </>
  )
}

/* ---------------- Payments (live, manual records only) ---------------- */
import { createPayment, listPayments, type PaymentRecord } from '../lib/api/payments'
export function LivePayments({ tenantId }: { tenantId: string }) {
  const toast = useToast()
  const [rows, setRows] = useState<PaymentRecord[] | null>(null)
  const [people, setPeople] = useState<Contact[]>([])
  const [memberships, setMemberships] = useState<GymMembership[]>([])
  const [err, setErr] = useState<unknown>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ contact_id: '', amount: '', method: 'upi' as PaymentRecord['method'], paid_at: new Date().toISOString().slice(0, 10), reference: '', notes: '', membership_id: '' })
  const load = useCallback(() => { setErr(null); Promise.all([listPayments(tenantId), listContacts(tenantId, { pageSize: 500 }), listGymMemberships(tenantId)]).then(([p,c,m]) => { setRows(p); setPeople(c.rows); setMemberships(m) }).catch((e) => { setErr(e); setRows([]) }) }, [tenantId])
  useEffect(load, [load])
  const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100)
  const collected = (rows ?? []).filter(r => r.status === 'received').reduce((n,r) => n + r.amount_paise, 0)
  return <>
    <PageHeader title="Payments" sub="Manually recorded customer payments. No gateway verification or automatic collection." actions={<Button icon={<I.Plus size={16}/>} onClick={() => setOpen(true)}>Record payment</Button>} />
    <SchemaNote e={err}/>
    <div className="grid sm:grid-cols-3 gap-4 mb-4"><Stat label="Recorded" value={money(collected)} icon={<I.CircleCheck size={18}/>} /><Stat label="Transactions" value={String(rows?.length ?? 0)} icon={<I.Receipt size={18}/>} /><Stat label="Manual entries" value={String((rows ?? []).filter(r => r.source === 'manual').length)} icon={<I.HandCoins size={18}/>} /></div>
    <Card>{err && !(err instanceof BackendError && err.kind === 'schema_missing') ? <ErrorState onRetry={load} body={errorMessage(err)}/> : <DataTable loading={rows === null} rows={rows ?? []} empty={<EmptyState title="No payments recorded" body="Record a customer payment to start your ledger." action={<Button onClick={() => setOpen(true)}>Record payment</Button>}/>} cols={[
      {key:'person',header:'Customer',mobile:'title',render:r=><span className="font-medium">{r.contact?.full_name ?? 'Customer'}</span>},
      {key:'amount',header:'Amount',render:r=><span className="font-semibold tabular-nums">{money(r.amount_paise)}</span>},
      {key:'method',header:'Method',render:r=><div>{r.method.replace('_',' ')}{r.membership_id&&<div className="text-xs text-ng-mute">Membership linked</div>}</div>},
      {key:'date',header:'Paid on',render:r=>new Date(r.paid_at).toLocaleDateString('en-IN')},
      {key:'ref',header:'Reference',render:r=>r.reference || '—'},
      {key:'status',header:'Status',render:r=><Status value={r.status === 'received' ? 'Received' : r.status}/>}
    ]}/>}</Card>
    <Modal open={open} onClose={() => setOpen(false)} title="Record a payment" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={busy} disabled={!form.contact_id || !/^\d+(\.\d{1,2})?$/.test(form.amount) || Number(form.amount) <= 0} onClick={async () => { setBusy(true); try { await createPayment(tenantId,{contact_id:form.contact_id,amount_paise:Math.round(Number(form.amount)*100),membership_id:form.membership_id||null,method:form.method,paid_at:new Date(form.paid_at+'T12:00:00').toISOString(),reference:form.reference,notes:form.notes}); toast('Payment recorded'); setOpen(false); setForm({...form,contact_id:'',membership_id:'',amount:'',reference:'',notes:''}); load() } catch(e) { toast(errorMessage(e),'err') } finally { setBusy(false) } }}>Save payment</Button></>}>
      <div className="space-y-4">
        <Field label="Customer"><Select value={form.contact_id} onChange={e=>setForm({...form,contact_id:e.target.value,membership_id:''})}><option value="">Choose customer</option>{people.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</Select></Field>
        <Field label="Membership (optional)"><Select value={form.membership_id} onChange={e=>setForm({...form,membership_id:e.target.value})}><option value="">General payment — not linked</option>{memberships.filter(m=>m.contact_id===form.contact_id).map(m=><option key={m.id} value={m.id}>{m.plan_name} · {m.start_date} to {m.end_date}</option>)}</Select></Field>
        <Field label="Amount (INR)"><Input inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="e.g. 1500.00"/></Field>
        <Field label="Payment method"><Select value={form.method} onChange={e=>setForm({...form,method:e.target.value as PaymentRecord['method']})}>{[['cash','Cash'],['upi','UPI'],['bank_transfer','Bank transfer'],['card','Card'],['cheque','Cheque'],['other','Other']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="Payment date"><Input type="date" value={form.paid_at} onChange={e=>setForm({...form,paid_at:e.target.value})}/></Field>
        <Field label="Reference (optional)"><Input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/></Field>
        <Field label="Notes (optional)"><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      </div>
    </Modal>
  </>
}


/* ---------------- Gym memberships (live lifecycle) ---------------- */
export function LiveGymMembers({ tenantId }: { tenantId: string }) {
  const toast = useToast()
  const [rows, setRows] = useState<GymMembership[] | null>(null)
  const [people, setPeople] = useState<Contact[]>([])
  const [plans, setPlans] = useState<GymMembershipPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState('')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [error, setError] = useState<unknown>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ contact_id: '', plan_name: 'Monthly', start_date: new Date().toISOString().slice(0,10), end_date: new Date(Date.now()+30*86400000).toISOString().slice(0,10), amount: '1800', notes: '' })

  const load = useCallback(() => {
    setError(null)
    Promise.all([listGymMemberships(tenantId), listAllContacts(tenantId), listGymMembershipPlans(tenantId,true)]).then(([m,c,p]) => { setRows(m); setPeople(c.filter(x => x.type === 'member' || x.type === 'person')); setPlans(p) }).catch(e => { setError(e); setRows([]) })
  }, [tenantId])
  useEffect(load, [load])

  const stateOf = (r: GymMembership) => r.status !== 'active' ? r.status : r.end_date < new Date().toISOString().slice(0,10) ? 'expired' : 'active'
  const filtered = (rows ?? []).filter(r => {
    const state = stateOf(r)
    return (tab === 'all' || (tab === 'active' ? state === 'active' : tab === 'expired' ? state === 'expired' : state === tab))
      && [r.contact?.full_name ?? '', r.plan_name, r.contact?.phone_e164 ?? ''].some(v => v.toLowerCase().includes(query.toLowerCase()))
  })
  const applyPlan = (id:string) => { const p=plans.find(x=>x.id===id); setSelectedPlan(id); if(!p)return; const start=form.start_date; const endDate=new Date(new Date(start+'T00:00:00').getTime()+p.duration_days*86400000-86400000); setForm(v=>({...v,plan_name:p.name,end_date:endDate.toISOString().slice(0,10),amount:(p.price_paise/100).toFixed(2).replace(/\\.00$/,'')})) }
  const amount = (n:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n/100)
  const counts = { active: (rows ?? []).filter(r => stateOf(r)==='active').length, expired: (rows ?? []).filter(r => stateOf(r)==='expired').length, paused: (rows ?? []).filter(r => r.status==='paused').length }

  const changeStatus = async (r: GymMembership, status: GymMembership['status']) => {
    try { await setGymMembershipStatus(r.id,status); toast(status==='active'?'Membership activated':status==='paused'?'Membership paused':'Membership cancelled'); load() }
    catch(e) { toast(errorMessage(e),'err') }
  }

  return <>
    <PageHeader title="Gym members" sub="Live membership records for this organisation." actions={<Button icon={<I.UserPlus size={16}/>} onClick={()=>setOpen(true)}>Add membership</Button>}/>
    <SchemaNote e={error}/>
    <div className="grid sm:grid-cols-3 gap-4 mb-4">
      <Stat label="Active memberships" value={String(counts.active)} icon={<I.UserCheck size={18}/>}/>
      <Stat label="Expired" value={String(counts.expired)} icon={<I.CalendarX size={18}/>}/>
      <Stat label="Paused" value={String(counts.paused)} icon={<I.PauseCircle size={18}/>}/>
    </div>
    <Card>
      <div className="p-4 border-b border-ng-line flex flex-col sm:flex-row gap-3 justify-between">
        <SearchBox value={query} onChange={setQuery} placeholder="Search member or plan" className="sm:w-72"/>
        <Tabs value={tab} onChange={setTab} tabs={[{id:'all',label:'All'},{id:'active',label:'Active',count:counts.active},{id:'expired',label:'Expired',count:counts.expired},{id:'paused',label:'Paused',count:counts.paused},{id:'cancelled',label:'Cancelled'}]}/>
      </div>
      {error && !(error instanceof BackendError && error.kind==='schema_missing') ? <ErrorState onRetry={load} body={errorMessage(error)}/> :
      <DataTable loading={rows===null} rows={filtered} empty={<EmptyState title="No memberships found" body={query?'Try another search.':'Add a membership to start tracking renewals.'} action={<Button onClick={()=>setOpen(true)}>Add membership</Button>}/>} cols={[
        {key:'member',header:'Member',mobile:'title',render:r=><div className="flex items-center gap-3"><Avatar name={r.contact?.full_name ?? 'Member'}/><div><div className="font-medium">{r.contact?.full_name ?? 'Member'}</div><div className="text-xs text-ng-mute">{r.contact?.phone_e164 ? mask(r.contact.phone_e164) : r.contact?.email ?? '—'}</div></div></div>},
        {key:'plan',header:'Plan',render:r=><div><div className="font-medium">{r.plan_name}</div><div className="text-xs text-ng-mute">{amount(r.amount_paise)}</div></div>},
        {key:'dates',header:'Period',render:r=><span className="text-sm">{new Date(r.start_date+'T00:00:00').toLocaleDateString('en-IN')} – {new Date(r.end_date+'T00:00:00').toLocaleDateString('en-IN')}</span>},
        {key:'status',header:'Status',render:r=><Status value={stateOf(r)}/>},
        {key:'actions',header:'',mobile:'hide',render:r=><Dropdown label={'Membership actions for '+(r.contact?.full_name ?? 'member')} trigger={<span className="size-8 grid place-items-center rounded-lg hover:bg-ng-tint"><I.MoreHorizontal size={18}/></span>} items={[
          ...(r.status==='active'?[{label:'Pause membership',icon:<I.Pause size={16}/>,onClick:()=>void changeStatus(r,'paused')}]:[]),
          ...(r.status==='paused'?[{label:'Reactivate',icon:<I.Play size={16}/>,onClick:()=>void changeStatus(r,'active')}]:[]),
          ...(r.status!=='cancelled'?[{label:'Cancel membership',icon:<I.Ban size={16}/>,danger:true,onClick:()=>void changeStatus(r,'cancelled')}]:[])
        ]}/>},
      ]}/>}
    </Card>
    <Modal open={open} onClose={()=>setOpen(false)} title="Add gym membership" footer={<><Button variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button><Button loading={busy} disabled={!form.contact_id || form.plan_name.trim().length<2 || !/^\\d+(\\.\\d{1,2})?$/.test(form.amount) || Number(form.amount)<0} onClick={async()=>{setBusy(true);try{await createGymMembership(tenantId,{contact_id:form.contact_id,plan_name:form.plan_name,start_date:form.start_date,end_date:form.end_date,amount_paise:Math.round(Number(form.amount)*100),notes:form.notes});toast('Membership created');setOpen(false);load()}catch(e){toast(errorMessage(e),'err')}finally{setBusy(false)}}}>Save membership</Button></>}>
      <div className="space-y-4">
        <Field label="Member"><Select value={form.contact_id} onChange={e=>setForm({...form,contact_id:e.target.value})}><option value="">Choose member</option>{people.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</Select></Field>
        <Field label="Membership plan"><Select value={selectedPlan} onChange={e=>applyPlan(e.target.value)}><option value="">Choose a saved plan or enter custom details</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name} · {p.duration_days} days · ₹{(p.price_paise/100).toLocaleString("en-IN")}</option>)}</Select></Field><Field label="Plan name"><Input value={form.plan_name} onChange={e=>{setSelectedPlan("");setForm({...form,plan_name:e.target.value})}}/></Field>
        <Field label="Start date"><Input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></Field>
        <Field label="End date"><Input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})}/></Field>
        <Field label="Membership price (INR)"><Input inputMode="decimal" value={form.amount} onChange={e=>{setSelectedPlan("");setForm({...form,amount:e.target.value})}}/></Field>
        <Field label="Notes (optional)"><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      </div>
    </Modal>
  </>
}


/* ---------------- Gym attendance (live) ---------------- */
export function LiveGymAttendance({ tenantId }: { tenantId: string }) {
  const toast = useToast()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [people, setPeople] = useState<Contact[]>([])
  const [marks, setMarks] = useState<Record<string, GymAttendanceStatus>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [contacts, attendance] = await Promise.all([listAllContacts(tenantId), listGymAttendance(tenantId, date)])
      const active = contacts.filter(x => x.type === 'member' || x.type === 'person')
      setPeople(active)
      setMarks(Object.fromEntries(attendance.map(x => [x.contact_id, x.status])))
    } catch (e) { setError(e) } finally { setLoading(false) }
  }, [tenantId, date])
  useEffect(() => { void load() }, [load])

  const counts = { present: Object.values(marks).filter(x => x === 'present').length, late: Object.values(marks).filter(x => x === 'late').length, absent: Object.values(marks).filter(x => x === 'absent').length }
  const save = async () => {
    setBusy(true)
    try {
      await saveGymAttendance(tenantId, date, Object.entries(marks).map(([contact_id, status]) => ({ contact_id, status })))
      toast('Attendance saved')
      await load()
    } catch (e) { toast(errorMessage(e), 'err') } finally { setBusy(false) }
  }

  return <>
    <PageHeader title="Gym attendance" sub="Live daily attendance records for this organisation." actions={<><Field label="Attendance date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field><Button loading={busy} disabled={!Object.keys(marks).length} onClick={() => void save()}>Save attendance</Button></>} />
    <SchemaNote e={error} />
    <div className="grid grid-cols-3 gap-3 mb-4">
      <Stat label="Present" value={String(counts.present)} icon={<I.UserCheck size={18} />} />
      <Stat label="Late" value={String(counts.late)} icon={<I.Clock size={18} />} />
      <Stat label="Absent" value={String(counts.absent)} icon={<I.UserX size={18} />} />
    </div>
    <Card>
      {error && !(error instanceof BackendError && error.kind === 'schema_missing') ? <ErrorState onRetry={() => void load()} body={errorMessage(error)} /> :
      <DataTable loading={loading} rows={people} empty={<EmptyState title="No members found" body="Add members before recording attendance." />} cols={[
        { key: 'person', header: 'Member', mobile: 'title', render: p => <div className="flex items-center gap-3"><Avatar name={p.full_name} /><div><div className="font-medium">{p.full_name}</div><div className="text-xs text-ng-mute">{p.phone_e164 ?? p.email ?? '—'}</div></div></div> },
        { key: 'mark', header: 'Attendance', render: p => <div className="inline-flex rounded-lg border border-ng-line p-0.5">{(['present','late','absent'] as GymAttendanceStatus[]).map(s => <button key={s} onClick={() => setMarks(prev => ({ ...prev, [p.id]: s }))} className={cx('h-8 px-3 text-xs rounded-md font-medium capitalize', marks[p.id] === s ? (s === 'absent' ? 'bg-ng-err text-white' : s === 'late' ? 'bg-ng-warn text-white' : 'bg-ng-ok text-white') : 'text-ng-mute hover:bg-ng-canvas')}>{s}</button>)}</div> },
      ]} />}
    </Card>
  </>
}


/* ---------------- Gym renewals (live) ---------------- */
export function LiveGymRenewals({ tenantId }: { tenantId: string }) {
  const toast = useToast()
  const [rows, setRows] = useState<GymMembership[] | null>(null)
  const [plans, setPlans] = useState<GymMembershipPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState('')
  const [query, setQuery] = useState('')
  const [range, setRange] = useState('all')
  const [renewing, setRenewing] = useState<GymMembership | null>(null)
  const [busy, setBusy] = useState(false)
  const [price, setPrice] = useState('1800')
  const [days, setDays] = useState('30')
  const [error, setError] = useState<unknown>(null)
  const today = new Date().toISOString().slice(0,10)
  const load = useCallback(async () => {
    setError(null)
    try { const [memberships,availablePlans] = await Promise.all([listGymMemberships(tenantId),listGymMembershipPlans(tenantId,true)]); setRows(memberships); setPlans(availablePlans) }
    catch (e) { setError(e); setRows([]) }
  }, [tenantId])
  useEffect(() => { void load() }, [load])
  const daysLeft = (date:string) => Math.ceil((new Date(date+'T00:00:00').getTime()-new Date(today+'T00:00:00').getTime())/86400000)
  const relevant = (rows ?? []).filter(r => r.status === 'active' && daysLeft(r.end_date) <= 30)
  const expired = relevant.filter(r => daysLeft(r.end_date) < 0).length
  const dueSoon = relevant.filter(r => daysLeft(r.end_date) >= 0).length
  const filtered = relevant.filter(r => {
    const left = daysLeft(r.end_date)
    return (range === 'all' || (range === 'expired' ? left < 0 : range === 'today' ? left === 0 : left >= 0 && left <= 30))
      && [r.contact?.full_name ?? '', r.plan_name, r.contact?.phone_e164 ?? ''].some(v => v.toLowerCase().includes(query.toLowerCase()))
  })
  const beginRenewal = (r:GymMembership) => { setRenewing(r); setSelectedPlan(''); setPrice((r.amount_paise/100).toFixed(2).replace(/\\.00$/,'')); setDays('30') }
  const applyRenewalPlan = (id:string) => { const p=plans.find(x=>x.id===id); setSelectedPlan(id); if(p){setPrice((p.price_paise/100).toFixed(2).replace(/\\.00$/,''));setDays(String(p.duration_days))} }
  const renew = async () => {
    if (!renewing) return
    const start = renewing.end_date >= today ? new Date(new Date(renewing.end_date+'T00:00:00').getTime()+86400000) : new Date(today+'T00:00:00')
    const end = new Date(start.getTime()+Number(days)*86400000-86400000)
    setBusy(true)
    try {
      await createGymMembership(tenantId,{contact_id:renewing.contact_id,plan_name:renewing.plan_name,start_date:start.toISOString().slice(0,10),end_date:end.toISOString().slice(0,10),amount_paise:Math.round(Number(price)*100),notes:'Renewal of membership '+renewing.id})
      toast('Renewal recorded as a new membership')
      setRenewing(null)
      await load()
    } catch(e) { toast(errorMessage(e),'err') } finally { setBusy(false) }
  }
  const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n/100)
  return <>
    <PageHeader title="Membership renewals" sub="Live memberships expiring within 30 days or already expired." actions={<Button variant="secondary" icon={<I.RefreshCw size={16}/>} onClick={()=>void load()}>Refresh</Button>}/>
    <SchemaNote e={error}/>
    <div className="grid sm:grid-cols-3 gap-4 mb-4">
      <Stat label="Due within 30 days" value={String(dueSoon)} icon={<I.CalendarClock size={18}/>}/>
      <Stat label="Expired" value={String(expired)} icon={<I.CalendarX size={18}/>}/>
      <Stat label="Renewal opportunities" value={String(relevant.length)} icon={<I.RefreshCw size={18}/>}/>
    </div>
    <Card>
      <div className="p-4 border-b border-ng-line flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={query} onChange={setQuery} placeholder="Search member or plan" className="sm:w-72"/>
        <Tabs value={range} onChange={setRange} tabs={[{id:'all',label:'All due'},{id:'expired',label:'Expired',count:expired},{id:'today',label:'Due today'},{id:'soon',label:'Next 30 days',count:dueSoon}]}/>
      </div>
      {error && !(error instanceof BackendError && error.kind==='schema_missing') ? <ErrorState onRetry={()=>void load()} body={errorMessage(error)}/> :
      <DataTable loading={rows===null} rows={filtered} empty={<EmptyState title="No renewals due" body="No active memberships are expiring within the next 30 days."/>} cols={[
        {key:'member',header:'Member',mobile:'title',render:r=><div className="flex items-center gap-3"><Avatar name={r.contact?.full_name ?? 'Member'}/><div><div className="font-medium">{r.contact?.full_name ?? 'Member'}</div><div className="text-xs text-ng-mute">{r.contact?.phone_e164 ?? r.contact?.email ?? '—'}</div></div></div>},
        {key:'plan',header:'Plan',render:r=><div><div className="font-medium">{r.plan_name}</div><div className="text-xs text-ng-mute">{money(r.amount_paise)}</div></div>},
        {key:'expiry',header:'Expires',render:r=><div><div>{new Date(r.end_date+'T00:00:00').toLocaleDateString('en-IN')}</div><div className="text-xs text-ng-mute">{daysLeft(r.end_date)<0?Math.abs(daysLeft(r.end_date))+' days overdue':daysLeft(r.end_date)===0?'Due today':daysLeft(r.end_date)+' days left'}</div></div>},
        {key:'renew',header:'',mobile:'hide',render:r=><Button size="sm" onClick={()=>beginRenewal(r)}>Renew</Button>},
      ]}/>}
    </Card>
    <Modal open={!!renewing} onClose={()=>setRenewing(null)} title={'Renew '+(renewing?.contact?.full_name ?? 'membership')} footer={<><Button variant="secondary" onClick={()=>setRenewing(null)}>Cancel</Button><Button loading={busy} disabled={!/^\\d+(\\.\\d{1,2})?$/.test(price)||Number(price)<0||(!/^\\d+$/.test(days)||Number(days)<1||Number(days)>1095)} onClick={()=>void renew()}>Record renewal</Button></>}>
      <div className="space-y-4">
        <Field label="Saved membership plan"><Select value={selectedPlan} onChange={e=>applyRenewalPlan(e.target.value)}><option value="">Keep current/custom duration</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name} · {p.duration_days} days · ₹{(p.price_paise/100).toLocaleString("en-IN")}</option>)}</Select></Field>
        <Field label="Renewal duration"><Select value={days} onChange={e=>setDays(e.target.value)}><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">365 days</option>{!["30","90","180","365"].includes(days)&&<option value={days}>{days} days (saved plan)</option>}</Select></Field>
        <Field label="Renewal amount (INR)"><Input inputMode="decimal" value={price} onChange={e=>{setSelectedPlan("");setPrice(e.target.value)}}/></Field>
        <p className="text-xs text-ng-mute">A new membership record is created. The previous record is preserved. No payment is collected and no reminder is sent.</p>
      </div>
    </Modal>
  </>
}


/* ---------------- Gym trainers (live) ---------------- */
export function LiveGymTrainers({ tenantId }: { tenantId: string }) {
  const toast = useToast()
  const [rows,setRows] = useState<GymTrainer[]|null>(null)
  const [people,setPeople] = useState<Contact[]>([])
  const [query,setQuery] = useState('')
  const [error,setError] = useState<unknown>(null)
  const [open,setOpen] = useState(false)
  const [busy,setBusy] = useState(false)
  const [form,setForm] = useState({contact_id:'',specialty:'Strength & conditioning',bio:''})
  const load = useCallback(async()=>{
    setError(null)
    try {
      const [trainers,contacts]=await Promise.all([listGymTrainers(tenantId),listAllContacts(tenantId)])
      setRows(trainers)
      const linked=new Set(trainers.map(t=>t.contact_id))
      setPeople(contacts.filter(c=>['person','staff','trainer'].includes(c.type)&&!linked.has(c.id)))
    } catch(e) {setError(e);setRows([])}
  },[tenantId])
  useEffect(()=>{void load()},[load])
  const filtered=(rows??[]).filter(r=>[r.contact?.full_name??'',r.specialty,r.contact?.phone_e164??''].some(v=>v.toLowerCase().includes(query.toLowerCase())))
  const active=(rows??[]).filter(r=>r.status==='active').length
  const act=async(r:GymTrainer,status:GymTrainer['status'])=>{
    try{await setGymTrainerStatus(r.id,status);toast(status==='active'?'Trainer activated':'Trainer deactivated');await load()}
    catch(e){toast(errorMessage(e),'err')}
  }
  return <>
    <PageHeader title="Trainers" sub="Live trainer profiles for this organisation." actions={<Button icon={<I.UserPlus size={16}/>} onClick={()=>setOpen(true)}>Add trainer</Button>}/>
    <SchemaNote e={error}/>
    <div className="grid sm:grid-cols-2 gap-4 mb-4">
      <Stat label="Total trainers" value={String(rows?.length??'—')} icon={<I.Users size={18}/>}/>
      <Stat label="Active trainers" value={String(rows?active:'—')} icon={<I.UserCheck size={18}/>}/>
    </div>
    <Card>
      <div className="p-4 border-b border-ng-line"><SearchBox value={query} onChange={setQuery} placeholder="Search trainer or speciality" className="sm:w-80"/></div>
      {error && !(error instanceof BackendError&&error.kind==='schema_missing')?<ErrorState onRetry={()=>void load()} body={errorMessage(error)}/>:
      <DataTable loading={rows===null} rows={filtered} empty={<EmptyState title="No trainers yet" body="Add a contact first, then register them as a trainer." action={<Button onClick={()=>setOpen(true)}>Add trainer</Button>}/>} cols={[
        {key:'name',header:'Trainer',mobile:'title',render:r=><div className="flex items-center gap-3"><Avatar name={r.contact?.full_name??'Trainer'}/><div><div className="font-medium">{r.contact?.full_name??'Trainer'}</div><div className="text-xs text-ng-mute">{r.contact?.phone_e164??r.contact?.email??'—'}</div></div></div>},
        {key:'specialty',header:'Speciality',render:r=><div><div className="font-medium">{r.specialty}</div>{r.bio&&<div className="text-xs text-ng-mute">{r.bio}</div>}</div>},
        {key:'status',header:'Status',render:r=><Status value={r.status}/>},
        {key:'actions',header:'',mobile:'hide',render:r=><Button size="sm" variant="secondary" onClick={()=>void act(r,r.status==='active'?'inactive':'active')}>{r.status==='active'?'Deactivate':'Activate'}</Button>}
      ]}/>}
    </Card>
    <Modal open={open} onClose={()=>setOpen(false)} title="Add trainer" footer={<><Button variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button><Button loading={busy} disabled={!form.contact_id||form.specialty.trim().length<2} onClick={async()=>{setBusy(true);try{await createGymTrainer(tenantId,form);toast('Trainer added');setOpen(false);setForm({contact_id:'',specialty:'Strength & conditioning',bio:''});await load()}catch(e){toast(errorMessage(e),'err')}finally{setBusy(false)}}}>Save trainer</Button></>}>
      <div className="space-y-4">
        <Field label="Trainer contact"><Select value={form.contact_id} onChange={e=>setForm({...form,contact_id:e.target.value})}><option value="">Choose a contact</option>{people.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</Select></Field>
        <Field label="Speciality"><Input value={form.specialty} onChange={e=>setForm({...form,specialty:e.target.value})}/></Field>
        <Field label="Bio (optional)"><Input value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></Field>
      </div>
    </Modal>
  </>
}


/* ---------------- Gym personal-training sessions (live) ---------------- */
export function LiveGymTrainingSessions({ tenantId }: { tenantId: string }) {
  const toast = useToast()
  const [sessions,setSessions] = useState<GymTrainingSession[]|null>(null)
  const [trainers,setTrainers] = useState<GymTrainer[]>([])
  const [members,setMembers] = useState<Contact[]>([])
  const [date,setDate] = useState(new Date().toISOString().slice(0,10))
  const [error,setError] = useState<unknown>(null)
  const [open,setOpen] = useState(false)
  const [busy,setBusy] = useState(false)
  const [form,setForm] = useState({trainer_id:'',member_contact_id:'',start:'09:00',duration:'60',session_type:'Personal training',notes:''})
  const load=useCallback(async()=>{
    setError(null)
    try {
      const from=new Date(date+'T00:00:00').toISOString()
      const to=new Date(new Date(date+'T00:00:00').getTime()+86400000).toISOString()
      const [s,t,people]=await Promise.all([listGymTrainingSessions(tenantId,from,to),listGymTrainers(tenantId),listAllContacts(tenantId)])
      setSessions(s);setTrainers(t.filter(x=>x.status==='active'));setMembers(people.filter(x=>x.type==='member'||x.type==='person'))
    } catch(e){setError(e);setSessions([])}
  },[tenantId,date])
  useEffect(()=>{void load()},[load])
  const trainerName=(id:string)=>trainers.find(t=>t.id===id)?.contact?.full_name??'Trainer'
  const memberName=(id:string)=>members.find(m=>m.id===id)?.full_name??'Member'
  const counts={scheduled:(sessions??[]).filter(s=>s.status==='scheduled').length,completed:(sessions??[]).filter(s=>s.status==='completed').length,cancelled:(sessions??[]).filter(s=>s.status==='cancelled'||s.status==='no_show').length}
  const create=async()=>{
    const start=new Date(date+'T'+form.start+':00')
    const end=new Date(start.getTime()+Number(form.duration)*60000)
    setBusy(true)
    try{
      await createGymTrainingSession(tenantId,{trainer_id:form.trainer_id,member_contact_id:form.member_contact_id,starts_at:start.toISOString(),ends_at:end.toISOString(),session_type:form.session_type,notes:form.notes})
      toast('Training session scheduled');setOpen(false);await load()
    }catch(e){toast(errorMessage(e),'err')}finally{setBusy(false)}
  }
  const update=async(id:string,status:GymTrainingSession['status'])=>{
    try{await setGymTrainingSessionStatus(id,status);toast('Session updated');await load()}
    catch(e){toast(errorMessage(e),'err')}
  }
  const time=(s:string)=>new Date(s).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
  return <>
    <PageHeader title="Training sessions" sub="Schedule and manage personal-training sessions." actions={<Button icon={<I.CalendarPlus size={16}/>} onClick={()=>setOpen(true)}>Schedule session</Button>}/>
    <div className="flex items-end gap-3 mb-4"><Field label="Session date"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field><Button variant="secondary" onClick={()=>void load()}>Refresh</Button></div>
    <SchemaNote e={error}/>
    <div className="grid sm:grid-cols-3 gap-4 mb-4">
      <Stat label="Scheduled" value={String(counts.scheduled)} icon={<I.CalendarClock size={18}/>}/>
      <Stat label="Completed" value={String(counts.completed)} icon={<I.CheckCircle2 size={18}/>}/>
      <Stat label="Cancelled / no-show" value={String(counts.cancelled)} icon={<I.CalendarX size={18}/>}/>
    </div>
    <Card>
      {error && !(error instanceof BackendError&&error.kind==='schema_missing')?<ErrorState onRetry={()=>void load()} body={errorMessage(error)}/>:
      <DataTable loading={sessions===null} rows={sessions??[]} empty={<EmptyState title="No sessions scheduled" body="Schedule a personal-training session for this date." action={<Button onClick={()=>setOpen(true)}>Schedule session</Button>}/>} cols={[
        {key:'time',header:'Time',mobile:'title',render:s=><div className="font-medium">{time(s.starts_at)} – {time(s.ends_at)}</div>},
        {key:'trainer',header:'Trainer',render:s=><span>{trainerName(s.trainer_id)}</span>},
        {key:'member',header:'Member',render:s=><span>{memberName(s.member_contact_id)}</span>},
        {key:'type',header:'Session',render:s=><span>{s.session_type}</span>},
        {key:'status',header:'Status',render:s=><Status value={s.status}/>},
        {key:'actions',header:'',mobile:'hide',render:s=>s.status==='scheduled'?<Dropdown label="Session actions" trigger={<span className="size-8 grid place-items-center rounded-lg hover:bg-ng-tint"><I.MoreHorizontal size={18}/></span>} items={[
          {label:'Mark completed',icon:<I.Check size={16}/>,onClick:()=>void update(s.id,'completed')},
          {label:'Mark no-show',icon:<I.UserX size={16}/>,onClick:()=>void update(s.id,'no_show')},
          {label:'Cancel session',icon:<I.Ban size={16}/>,danger:true,onClick:()=>void update(s.id,'cancelled')}
        ]}/>:null}
      ]}/>}
    </Card>
    <Modal open={open} onClose={()=>setOpen(false)} title="Schedule training session" footer={<><Button variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button><Button loading={busy} disabled={!form.trainer_id||!form.member_contact_id||!form.start||!['30','45','60','90'].includes(form.duration)} onClick={()=>void create()}>Schedule session</Button></>}>
      <div className="space-y-4">
        <Field label="Trainer"><Select value={form.trainer_id} onChange={e=>setForm({...form,trainer_id:e.target.value})}><option value="">Choose trainer</option>{trainers.map(t=><option key={t.id} value={t.id}>{t.contact?.full_name??'Trainer'} · {t.specialty}</option>)}</Select></Field>
        <Field label="Member"><Select value={form.member_contact_id} onChange={e=>setForm({...form,member_contact_id:e.target.value})}><option value="">Choose member</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</Select></Field>
        <Field label="Start time"><Input type="time" value={form.start} onChange={e=>setForm({...form,start:e.target.value})}/></Field>
        <Field label="Duration"><Select value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></Select></Field>
        <Field label="Session type"><Input value={form.session_type} onChange={e=>setForm({...form,session_type:e.target.value})}/></Field>
        <Field label="Notes"><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      </div>
    </Modal>
  </>
}


/* ---------------- Trainer availability and leave (live) ---------------- */
export function LiveGymTrainerAvailability({ tenantId }: { tenantId:string }) {
 const toast=useToast()
 const [trainers,setTrainers]=useState<GymTrainer[]>([])
 const [selected,setSelected]=useState('')
 const [slots,setSlots]=useState<TrainerAvailability[]>([])
 const [leave,setLeave]=useState<TrainerTimeOff[]>([])
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState<unknown>(null)
 const [leaveOpen,setLeaveOpen]=useState(false)
 const [leaveForm,setLeaveForm]=useState({starts_at:'',ends_at:'',reason:''})
 const from=new Date().toISOString(), to=new Date(Date.now()+90*86400000).toISOString()
 const load=useCallback(async()=>{
  setLoading(true);setError(null)
  try {
   const [t,l]=await Promise.all([listGymTrainers(tenantId),listTrainerTimeOff(tenantId,from,to)])
   const active=t.filter(x=>x.status==='active');setTrainers(active)
   const trainerId=selected&&active.some(x=>x.id===selected)?selected:(active[0]?.id??'')
   setSelected(trainerId);setLeave(l)
   setSlots(trainerId?await listTrainerAvailability(tenantId).then(all=>all.filter(x=>x.trainer_id===trainerId)):[])
  } catch(e){setError(e)} finally{setLoading(false)}
 },[tenantId,selected])
 useEffect(()=>{void load()},[load])
 const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
 const setSlot=(day:number,field:'starts_at'|'ends_at',value:string)=>{
  setSlots(prev=>{
   const existing=prev.find(x=>x.weekday===day)
   if(existing)return prev.map(x=>x.weekday===day?{...x,[field]:value}:x)
   return [...prev,{id:'',tenant_id:tenantId,trainer_id:selected,weekday:day,starts_at:field==='starts_at'?value:'09:00',ends_at:field==='ends_at'?value:'18:00'}]
  })
 }
 const toggleDay=(day:number,on:boolean)=>{
  setSlots(prev=>on?[...prev,{id:'',tenant_id:tenantId,trainer_id:selected,weekday:day,starts_at:'09:00',ends_at:'18:00'}]:prev.filter(x=>x.weekday!==day))
 }
 const save=async()=>{
  setBusy(true)
  try{await saveTrainerAvailability(tenantId,selected,slots.map(({weekday,starts_at,ends_at})=>({weekday,starts_at,ends_at})));toast('Working hours saved');await load()}
  catch(e){toast(errorMessage(e),'err')}finally{setBusy(false)}
 }
 const addLeave=async()=>{
  setBusy(true)
  try{await createTrainerTimeOff(tenantId,{trainer_id:selected,starts_at:new Date(leaveForm.starts_at).toISOString(),ends_at:new Date(leaveForm.ends_at).toISOString(),reason:leaveForm.reason});toast('Trainer leave added');setLeaveOpen(false);setLeaveForm({starts_at:'',ends_at:'',reason:''});await load()}
  catch(e){toast(errorMessage(e),'err')}finally{setBusy(false)}
 }
 const removeLeave=async(id:string)=>{
  try{await deleteTrainerTimeOff(id);toast('Leave removed');await load()}catch(e){toast(errorMessage(e),'err')}
 }
 return <>
  <PageHeader title="Trainer availability" sub="Set weekly working hours and manage trainer leave." actions={<Button loading={busy} disabled={!selected} onClick={()=>void save()}>Save working hours</Button>}/>
  <SchemaNote e={error}/>
  <Card>
   <div className="p-4 border-b border-ng-line"><Field label="Trainer"><Select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose trainer</option>{trainers.map(t=><option key={t.id} value={t.id}>{t.contact?.full_name??'Trainer'}</option>)}</Select></Field></div>
   <div className="p-4 space-y-3">
    <div className="font-semibold">Weekly working hours <span className="text-xs text-ng-mute font-normal">(UTC)</span></div>
    {weekdays.map((day,i)=>{
     const slot=slots.find(x=>x.weekday===i)
     return <div key={day} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-3 border-b border-ng-line py-2">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!slot} onChange={e=>toggleDay(i,e.target.checked)}/>{day}</label>
      <Input type="time" disabled={!slot} value={slot?.starts_at??'09:00'} onChange={e=>setSlot(i,'starts_at',e.target.value)}/>
      <Input type="time" disabled={!slot} value={slot?.ends_at??'18:00'} onChange={e=>setSlot(i,'ends_at',e.target.value)}/>
     </div>
    })}
    <p className="text-xs text-ng-mute">If no weekly hours are configured for a trainer, session scheduling remains unrestricted by working hours. Once configured, sessions must fit within an enabled time slot.</p>
   </div>
  </Card>
  <div className="flex items-center justify-between mt-5 mb-3"><h3 className="font-semibold">Upcoming leave / unavailable time</h3><Button variant="secondary" onClick={()=>setLeaveOpen(true)} disabled={!selected}>Add leave</Button></div>
  <Card>
   {leave.length===0?<EmptyState title="No leave recorded" body="Add leave or unavailable time to block session bookings."/>:
    <DataTable rows={leave.filter(x=>x.trainer_id===selected)} cols={[
     {key:'period',header:'Unavailable period',mobile:'title',render:x=><div><div className="font-medium">{new Date(x.starts_at).toLocaleString('en-IN')}</div><div className="text-xs text-ng-mute">Until {new Date(x.ends_at).toLocaleString('en-IN')}</div></div>},
     {key:'reason',header:'Reason',render:x=><span>{x.reason??'—'}</span>},
     {key:'action',header:'',render:x=><Button size="sm" variant="secondary" onClick={()=>void removeLeave(x.id)}>Remove</Button>}
    ]}/>}
  </Card>
  <Modal open={leaveOpen} onClose={()=>setLeaveOpen(false)} title="Add trainer leave" footer={<><Button variant="secondary" onClick={()=>setLeaveOpen(false)}>Cancel</Button><Button loading={busy} disabled={!leaveForm.starts_at||!leaveForm.ends_at||Date.parse(leaveForm.ends_at)<=Date.parse(leaveForm.starts_at)} onClick={()=>void addLeave()}>Save leave</Button></>}>
   <div className="space-y-4">
    <Field label="Starts"><Input type="datetime-local" value={leaveForm.starts_at} onChange={e=>setLeaveForm({...leaveForm,starts_at:e.target.value})}/></Field>
    <Field label="Ends"><Input type="datetime-local" value={leaveForm.ends_at} onChange={e=>setLeaveForm({...leaveForm,ends_at:e.target.value})}/></Field>
    <Field label="Reason (optional)"><Input value={leaveForm.reason} onChange={e=>setLeaveForm({...leaveForm,reason:e.target.value})}/></Field>
   </div>
  </Modal>
 </>
}


/* ---------------- Gym membership plan catalogue (live) ---------------- */
export function LiveGymMembershipPlans({tenantId}:{tenantId:string}){
 const toast=useToast()
 const [rows,setRows]=useState<GymMembershipPlan[]|null>(null)
 const [error,setError]=useState<unknown>(null)
 const [open,setOpen]=useState(false)
 const [busy,setBusy]=useState(false)
 const [editing,setEditing]=useState<GymMembershipPlan|null>(null)
 const [form,setForm]=useState({name:'',duration:'30',price:'1800',description:''})
 const load=useCallback(async()=>{setError(null);try{setRows(await listGymMembershipPlans(tenantId))}catch(e){setError(e);setRows([])}},[tenantId])
 useEffect(()=>{void load()},[load])
 const start=(r?:GymMembershipPlan)=>{setEditing(r??null);setForm(r?{name:r.name,duration:String(r.duration_days),price:(r.price_paise/100).toFixed(2).replace(/\.00$/,''),description:r.description??''}:{name:'',duration:'30',price:'1800',description:''});setOpen(true)}
 const save=async()=>{setBusy(true);try{await saveGymMembershipPlan(tenantId,{id:editing?.id,name:form.name,duration_days:Number(form.duration),price_paise:Math.round(Number(form.price)*100),description:form.description});toast(editing?'Plan updated':'Plan created');setOpen(false);await load()}catch(e){toast(errorMessage(e),'err')}finally{setBusy(false)}}
 const toggle=async(r:GymMembershipPlan)=>{try{await setGymMembershipPlanActive(tenantId,r.id,!r.is_active);toast(r.is_active?'Plan archived':'Plan activated');await load()}catch(e){toast(errorMessage(e),'err')}}
 const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n/100)
 return <>
  <PageHeader title="Membership plans" sub="Create reusable gym packages and pricing." actions={<Button icon={<I.Plus size={16}/>} onClick={()=>start()}>Add plan</Button>}/>
  <SchemaNote e={error}/>
  <div className="grid sm:grid-cols-2 gap-4 mb-4">
   <Stat label="Total plans" value={String(rows?.length??'—')} icon={<I.Layers size={18}/>}/>
   <Stat label="Active plans" value={String(rows?.filter(x=>x.is_active).length??'—')} icon={<I.BadgeCheck size={18}/>}/>
  </div>
  <Card>
   {error&&!(error instanceof BackendError&&error.kind==='schema_missing')?<ErrorState onRetry={()=>void load()} body={errorMessage(error)}/>:
   <DataTable loading={rows===null} rows={rows??[]} empty={<EmptyState title="No membership plans" body="Create your first reusable package." action={<Button onClick={()=>start()}>Add plan</Button>}/>} cols={[
    {key:'name',header:'Plan',mobile:'title',render:r=><div><div className="font-medium">{r.name}</div><div className="text-xs text-ng-mute">{r.description??'No description'}</div></div>},
    {key:'duration',header:'Duration',render:r=>r.duration_days+' days'},
    {key:'price',header:'Price',render:r=><span className="font-medium">{money(r.price_paise)}</span>},
    {key:'status',header:'Status',render:r=><Status value={r.is_active?'active':'inactive'}/>},
    {key:'actions',header:'',mobile:'hide',render:r=><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={()=>start(r)}>Edit</Button><Button size="sm" variant="secondary" onClick={()=>void toggle(r)}>{r.is_active?'Archive':'Activate'}</Button></div>}
   ]}/>}
  </Card>
  <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Edit membership plan':'Create membership plan'} footer={<><Button variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button><Button loading={busy} disabled={form.name.trim().length<2||!/^\d+$/.test(form.duration)||Number(form.duration)<1||Number(form.duration)>1095||!/^\d+(\.\d{1,2})?$/.test(form.price)||Number(form.price)<0} onClick={()=>void save()}>Save plan</Button></>}>
   <div className="space-y-4">
    <Field label="Plan name"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Monthly, Quarterly, Annual"/></Field>
    <Field label="Duration (days)"><Input type="number" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}/></Field>
    <Field label="Price (₹)"><Input type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></Field>
    <Field label="Description"><Input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field>
   </div>
  </Modal>
 </>
}
