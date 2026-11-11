import { useCallback, useEffect, useState } from 'react'
import * as I from 'lucide-react'
import { Avatar, Badge, Button, Card, Confirm, DataTable, Dropdown, EmptyState, ErrorState, Field, Input, Modal, PageHeader, SearchBox, Select, Status, useToast } from '../ui'
import { BackendError, errorMessage } from '../lib/api/errors'
import { changeStaffRole, inviteStaff, listAssignableRoles, listStaff, setStaffStatus } from '../lib/api/staff'
import { archiveContact, createContact, createContacts, listAllContacts, listContacts, recordConsent } from '../lib/api/contacts'
import { contactsToCsv, parseContactsCsv, type CsvContactRow } from '../lib/csv'
import type { Channel, Contact, StaffMember } from '../lib/api/types'

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
