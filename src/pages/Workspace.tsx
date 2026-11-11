import { useState, type ReactNode } from 'react'
import * as I from 'lucide-react'
import { Link, go } from '../lib/router'
import { useAuth, useLiveTenant } from '../lib/auth'
import { LivePeople, LiveStaff } from './LiveData'
import { busStops, inr, members, students } from '../data'
import { AreaChart, Avatar, Badge, BarChart, Button, Card, CardHeader, Chips, DataTable, Donut, Dropdown, EmptyState, Field, Input, Logo, Modal, PageHeader, SearchBox, Select, Skel, Stat, Status, Tabs, Toggle, cx, useFakeLoad, useToast } from '../ui'

export type Ind = 'gym' | 'education' | 'hospital' | 'hotel'
export const isInd = (s: string): s is Ind => ['gym', 'education', 'hospital', 'hotel'].includes(s)

type Mod = [key: string, label: string, icon: I.LucideIcon]
const modules: Record<Ind, Mod[]> = {
  gym: [['members', 'Members', I.Users], ['memberships', 'Memberships', I.IdCard], ['attendance', 'Attendance', I.ScanLine], ['trainers', 'Trainers', I.Dumbbell], ['renewals', 'Renewals', I.RefreshCcw]],
  education: [['students', 'Students', I.GraduationCap], ['parents', 'Parents', I.HeartHandshake], ['teachers', 'Teachers', I.Presentation], ['classes', 'Classes', I.School], ['attendance', 'Attendance', I.ScanLine], ['fees', 'Fees', I.Wallet], ['transport', 'Transport', I.Bus], ['timetables', 'Timetables', I.CalendarDays], ['examinations', 'Examinations', I.FileCheck2]],
  hospital: [['patients', 'Patients', I.HeartPulse], ['appointments', 'Appointments', I.CalendarCheck], ['doctors', 'Doctors', I.Stethoscope], ['queue', 'Queue', I.ListOrdered], ['departments', 'Departments', I.Hospital]],
  hotel: [['rooms', 'Rooms', I.BedDouble], ['reservations', 'Reservations', I.BookmarkCheck], ['checkin', 'Check-in / out', I.DoorOpen], ['housekeeping', 'Housekeeping', I.SprayCan], ['guests', 'Guests', I.Users]],
}
const tenant: Record<Ind, { name: string; label: string; short: string }> = {
  gym: { name: 'Pulse Fitness Club', label: 'Gym & Fitness', short: 'PF' },
  education: { name: 'St. Xavier Institute of Technology', label: 'Schools & Colleges', short: 'SX' },
  hospital: { name: 'Lotus City Hospital', label: 'Hospitals & Clinics', short: 'LC' },
  hotel: { name: 'Harbor View Hotel', label: 'Hotels', short: 'HV' },
}
const peopleLabel: Record<Ind, string> = { gym: 'Members', education: 'Students & parents', hospital: 'Patients', hotel: 'Guests' }

export function WorkspaceLayout({ ind, path, children }: { ind: Ind; path: string; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false)
  const auth = useAuth()
  const base = `/app/${ind}`
  const core: [string, string, I.LucideIcon][] = [['Overview', 'overview', I.LayoutGrid], ['People', 'people', I.Contact], ['Staff', 'staff', I.UserCog], ['Operations', 'operations', I.Workflow], ['Communications', 'comms', I.MessageSquareText], ['Payments', 'payments', I.CreditCard], ['Reports', 'reports', I.ChartColumn], ['Automation', 'automation', I.Zap], ['Settings', 'settings', I.Settings], ['Files', 'files', I.FolderOpen]]
  const t = tenant[ind]
  const link = (to: string, label: string, Ic: I.LucideIcon, sub = false) => {
    const active = path === to || path.startsWith(to + '/')
    return (
      <Link key={to} to={to} title={label} onClick={() => setDrawer(false)} className={cx('flex items-center gap-3 h-10 rounded-lg text-sm font-medium transition-all px-3 md:justify-center lg:justify-start', active ? 'bg-ng-midnight text-ng-lime shadow-ng-sm' : 'text-ng-mute hover:bg-ng-tint hover:text-ng-ink', sub && 'lg:pl-3')}>
        <Ic size={18} className="shrink-0" /><span className="md:hidden lg:inline">{label}</span>
      </Link>
    )
  }
  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-none">
      <div className="space-y-0.5">{core.map(([l, k, Ic]) => link(`${base}/${k}`, l, Ic))}</div>
      <div className="mt-5 mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ng-mute md:hidden lg:block">{t.label} modules</div>
      <div className="mt-5 md:block lg:hidden border-t border-ng-line pt-3" />
      <div className="space-y-0.5">{modules[ind].map(([k, l, Ic]) => link(`${base}/m/${k}`, l, Ic, true))}</div>
    </nav>
  )
  const head = (
    <div className="h-16 px-4 flex items-center border-b border-ng-line md:justify-center lg:justify-start">
      <span className="md:hidden lg:block"><Logo size={28} /></span><span className="hidden md:block lg:hidden"><Logo compact size={30} /></span>
    </div>
  )
  const tabs: [string, string, I.LucideIcon][] = [['Home', 'overview', I.LayoutGrid], ['People', 'people', I.Contact], ['Messages', 'comms', I.MessageSquareText], ['Payments', 'payments', I.CreditCard]]
  return (
    <div className="min-h-screen md:pl-[72px] lg:pl-[260px]">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[72px] lg:w-[260px] flex-col bg-white border-r border-ng-line z-30">
        {head}{nav}
        <div className="p-3 border-t border-ng-line md:hidden lg:block"><Link to={`${base}/billing`} className="block rounded-xl bg-gradient-to-br from-ng-tint to-white border border-ng-indigo/15 p-3 hover:shadow-ng-md transition"><div className="flex justify-between text-xs"><b>Professional</b><Badge tone="ok" dot={false}>Active</Badge></div><div className="mt-2 h-1.5 rounded-full bg-white"><div className="h-full w-[62%] rounded-full bg-ng-midnight" /></div><div className="text-[11px] text-ng-mute mt-1.5">6,200 of 10,000 messages</div></Link></div>
      </aside>
      {drawer && (
        <div className="md:hidden fixed inset-0 z-50"><div className="absolute inset-0 bg-ng-midnight/50 animate-fade" onClick={() => setDrawer(false)} /><aside className="absolute inset-y-0 left-0 w-72 flex flex-col bg-white animate-fade">{head}{nav}</aside></div>
      )}
      <header className="sticky top-0 z-20 h-16 flex items-center gap-2 sm:gap-3 px-3 md:px-8 bg-white/85 backdrop-blur border-b border-ng-line">
        <button className="md:hidden size-10 grid place-items-center rounded-lg hover:bg-ng-canvas cursor-pointer" aria-label="Open navigation" onClick={() => setDrawer(true)}><I.Menu /></button>
        <Dropdown align="left" label="Switch organisation" trigger={<span className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-ng-canvas"><span className="size-8 rounded-lg bg-gradient-to-br from-ng-indigo to-ng-violet text-ng-midnight text-xs font-bold grid place-items-center">{t.short}</span><span className="text-left leading-tight max-w-[140px] sm:max-w-[260px]"><b className="block text-sm truncate">{t.name}</b><span className="text-[11px] text-ng-mute">{t.label}</span></span><I.ChevronsUpDown size={14} className="text-ng-mute" /></span>} items={[{ label: 'Pulse Fitness Club (Gym)', icon: <I.Dumbbell size={16} />, onClick: () => go('/app/gym/overview') }, { label: 'St. Xavier Institute (Education)', icon: <I.GraduationCap size={16} />, onClick: () => go('/app/education/overview') }, { divider: true, label: '' }, { label: 'Preview Hospital workspace', icon: <I.Stethoscope size={16} />, onClick: () => go('/app/hospital/overview') }, { label: 'Preview Hotel workspace', icon: <I.BedDouble size={16} />, onClick: () => go('/app/hotel/overview') }]} />
        <div className="flex-1" />
        <div className="hidden lg:block w-72"><SearchBox value="" onChange={() => {}} placeholder="Search people, payments…" /></div>
        <Button size="sm" className="hidden sm:inline-flex" icon={<I.Send size={14} />} onClick={() => go(`${base}/comms`)}>New message</Button>
        <button className="relative size-10 grid place-items-center rounded-lg hover:bg-ng-canvas text-ng-mute cursor-pointer" aria-label="Notifications"><I.Bell size={19} /><span className="absolute top-2 right-2.5 size-2 rounded-full bg-ng-indigo" /></button>
        <Dropdown label="Account menu" trigger={<Avatar name="Anita Rao" />} items={[{ label: 'Subscription & billing', icon: <I.CreditCard size={16} />, onClick: () => go(`${base}/billing`) }, { label: 'Organisation settings', icon: <I.Settings size={16} />, onClick: () => go(`${base}/settings`) }, { divider: true, label: '' }, { label: 'Log out', icon: <I.LogOut size={16} />, onClick: async () => { await auth.signOut(); go('/login') }, danger: true }]} />
      </header>
      <main key={path} className="px-4 md:px-8 py-6 md:py-8 pb-28 md:pb-10 max-w-[1320px] animate-fade">{children}</main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 bg-white/95 backdrop-blur border-t border-ng-line pb-[env(safe-area-inset-bottom)]" aria-label="Primary">
        {tabs.map(([l, k, Ic]) => { const a = path.startsWith(`${base}/${k}`); return <Link key={k} to={`${base}/${k}`} className={cx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', a ? 'text-ng-indigo-d' : 'text-ng-mute')}><span className={cx('h-7 w-12 grid place-items-center rounded-full transition', a && 'bg-ng-tint')}><Ic size={19} /></span>{l}</Link> })}
        <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-ng-mute cursor-pointer"><span className="h-7 w-12 grid place-items-center"><I.Ellipsis size={19} /></span>More</button>
      </nav>
    </div>
  )
}

/* ---------- Overview ---------- */
export function WorkspaceOverview({ ind }: { ind: Ind }) {
  const loading = useFakeLoad(750, [ind])
  const base = `/app/${ind}`
  const cfg = {
    gym: { stats: [['Active members', '1,240', '+4.8%', I.Users], ['Renewals due (7 days)', '38', '+6', I.RefreshCcw], ['Today check-ins', '312', '+11%', I.ScanLine], ['Collected this month', '₹4.2L', '+9.1%', I.IndianRupee]], chart: 'Daily check-ins', data: [210, 240, 228, 290, 312, 355, 280, 301, 330, 312], act: [['Renewal reminder sent to 38 members', 'WhatsApp · 10 min ago'], ['Diya Sharma renewed Quarterly Pro', '₹5,400 · 1 hr ago'], ['New member: Zoya Ali', 'Monthly plan · 3 hrs ago']], quick: [['Send renewal reminders', '/comms', I.Send], ['Add member', '/m/members', I.UserPlus], ['Mark attendance', '/m/attendance', I.ScanLine]] },
    education: { stats: [['Students', '8,420', '+2.1%', I.GraduationCap], ['Fee dues', '₹18.4L', '-3.2%', I.Wallet], ['Attendance today', '93%', '+1.4%', I.ScanLine], ['Buses running', '80', '0', I.Bus]], chart: 'Attendance this fortnight (%)', data: [91, 93, 92, 94, 90, 93, 95, 92, 93, 93], act: [['Bus 14 route change published', '42 recipients · 12 min ago'], ['Fee reminder sent to 312 guardians', 'SMS · 1 hr ago'], ['Semester 4 timetable updated', 'by Dr. Rao · yesterday']], quick: [['Announce to a bus', '/comms?audience=bus14', I.Bus], ['Mark attendance', '/m/attendance', I.ScanLine], ['Collect fees', '/m/fees', I.Wallet]] },
    hospital: { stats: [['Appointments today', '184', '+7%', I.CalendarCheck], ['In queue', '23', '-4', I.ListOrdered], ['Doctors on duty', '31', '0', I.Stethoscope], ['Billing today', '₹6.8L', '+5%', I.IndianRupee]], chart: 'Appointments', data: [150, 164, 172, 160, 181, 190, 184, 176, 188, 184], act: [['Patient record accessed by Dr. Mehta', 'Logged with reason · 4 min ago'], ['Queue token 41 called', 'OPD 2 · 6 min ago']], quick: [['Register patient', '/m/patients', I.UserPlus], ['Send appointment reminders', '/comms', I.Send]] },
    hotel: { stats: [['Occupancy', '78%', '+5%', I.BedDouble], ['Arrivals today', '24', '+3', I.DoorOpen], ['Rooms to clean', '11', '-2', I.SprayCan], ['Revenue today', '₹2.1L', '+8%', I.IndianRupee]], chart: 'Occupancy (%)', data: [68, 71, 74, 70, 78, 82, 80, 76, 79, 78], act: [['Room 204 checked in', '10 min ago'], ['Housekeeping done: 312', '32 min ago']], quick: [['New reservation', '/m/reservations', I.Plus], ['Message a guest', '/comms', I.Send]] },
  }[ind]
  const t = tenant[ind]
  return (
    <>
      <PageHeader title={`Good morning, ${ind === 'education' ? 'Dr. Rao' : 'Rohan'}`} sub={`${t.name} · ${t.label}`} actions={<Select className="!w-40" aria-label="Period"><option>Last 30 days</option><option>This quarter</option></Select>} />
      {(ind === 'hospital' || ind === 'hotel') && <div className="mb-4 rounded-xl border border-ng-indigo/20 bg-ng-tint px-4 py-3 text-sm text-ng-indigo-d flex gap-2"><I.Info size={18} className="shrink-0 mt-0.5" />This workspace is a design preview. The {ind} module package is in the catalogue and will reuse these same patterns.{ind === 'hospital' && ' Patient data would receive stricter access and audit controls.'}</div>}
      {loading ? <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skel key={i} className="h-32" />)}</div> : <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{cfg.stats.map(([l, v, d, Ic], i) => { const C = Ic as I.LucideIcon; return <Stat key={l as string} i={i} label={l as string} value={v as string} delta={d === '0' ? undefined : (d as string)} icon={<C size={18} />} /> })}</div>}
      <div className="grid xl:grid-cols-[1.6fr_1fr] gap-4 mt-4">
        <Card><CardHeader title={cfg.chart} sub="Last 10 days" /><div className="p-5">{loading ? <Skel className="h-56" /> : <AreaChart data={cfg.data} labels={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((d) => 'Day ' + d)} />}</div></Card>
        <Card><CardHeader title="Quick actions" /><div className="p-3">{cfg.quick.map(([l, to, Ic]) => { const C = Ic as I.LucideIcon; return <Link key={l as string} to={base + to} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ng-canvas transition group"><span className="size-9 rounded-lg bg-ng-midnight text-ng-lime grid place-items-center group-hover:scale-110 transition"><C size={17} /></span><span className="flex-1 text-sm font-medium">{l as string}</span><I.ArrowRight size={16} className="text-ng-mute group-hover:translate-x-1 transition" /></Link> })}</div></Card>
      </div>
      <Card className="mt-4"><CardHeader title="Recent activity" />{loading ? <div className="p-5 space-y-3"><Skel className="h-10" /><Skel className="h-10" /></div> : <ul className="p-3">{cfg.act.map(([a, b]) => <li key={a} className="flex gap-3 p-3 rounded-lg hover:bg-ng-canvas"><span className="size-2 rounded-full bg-ng-indigo mt-2 shrink-0" /><div><div className="text-sm font-medium">{a}</div><div className="text-xs text-ng-mute">{b}</div></div></li>)}</ul>}</Card>
    </>
  )
}

/* ---------- People (contacts) ---------- */
const mask = (n: number) => `+91 ••••• ••${(n * 37) % 90 + 10}`
function DemoPeoplePage({ ind }: { ind: Ind }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [seg, setSeg] = useState('All')
  const [add, setAdd] = useState(false)
  const loading = useFakeLoad(600)
  const src = ind === 'gym' ? members.map((m, i) => ({ id: m.id, name: m.name, kind: 'Member', note: m.plan, consent: i % 5 === 4 ? 'Opted out' : 'Opted in', i })) : students.flatMap((s, i) => [{ id: s.id, name: s.name, kind: 'Student', note: s.klass, consent: 'Opted in', i }, { id: s.id + 'g', name: s.guardian, kind: 'Parent', note: 'Guardian of ' + s.name.split(' ')[0], consent: i === 4 ? 'Opted out' : 'Opted in', i: i + 20 }])
  const kinds = ['All', ...new Set(src.map((s) => s.kind))]
  const rows = src.filter((r) => (seg === 'All' || r.kind === seg) && (r.name + r.note).toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="People" sub={`${peopleLabel[ind]} directory. Contacts never receive an account, and phone numbers are masked.`} actions={<><Button variant="secondary" icon={<I.Upload size={16} />} onClick={() => toast('Import wizard opened (prototype)', 'info')}>Import</Button><Button icon={<I.UserPlus size={16} />} onClick={() => setAdd(true)}>Add person</Button></>} />
      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-3 md:items-center border-b border-ng-line"><SearchBox value={q} onChange={setQ} placeholder="Search people" className="md:w-72" /><Chips options={kinds} value={seg} onChange={setSeg} /></div>
        <DataTable loading={loading} rows={rows} cols={[
          { key: 'name', header: 'Name', mobile: 'title', render: (r) => <div className="flex items-center gap-3"><Avatar name={r.name} /><span className="font-medium">{r.name}</span></div> },
          { key: 'kind', header: 'Type' }, { key: 'note', header: 'Details' },
          { key: 'ph', header: 'Phone', render: (r) => <span className="font-mono text-xs text-ng-mute">{mask(r.i)}</span> },
          { key: 'consent', header: 'Consent', render: (r) => <Status value={r.consent} /> },
        ]} />
      </Card>
      <Modal open={add} onClose={() => setAdd(false)} title="Add person" footer={<><Button variant="secondary" onClick={() => setAdd(false)}>Cancel</Button><Button onClick={() => { setAdd(false); toast('Person added. Consent status: awaiting opt-in') }}>Add person</Button></>}>
        <div className="space-y-4"><Field label="Full name"><Input /></Field><Field label="Mobile number"><Input placeholder="+91" /></Field><Field label="Consent source" hint="Required before any WhatsApp message is sent."><Select><option>Signed form</option><option>Website opt-in</option><option>Verbal, recorded by staff</option></Select></Field></div>
      </Modal>
    </>
  )
}

/* ---------- Staff ---------- */
function DemoStaffPage() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [staff, setStaff] = useState([{ id: 1, n: 'Anita Rao', r: 'Organisation Owner', s: 'Active', l: 'Today' }, { id: 2, n: 'Vivek Nair', r: 'Organisation Admin', s: 'Active', l: 'Today' }, { id: 3, n: 'Pooja Shetty', r: 'Manager', s: 'Active', l: 'Yesterday' }, { id: 4, n: 'Arun Das', r: 'Accountant', s: 'Active', l: '3 days ago' }, { id: 5, n: 'Mina Thomas', r: 'Operator', s: 'Pending', l: 'Invited' }, { id: 6, n: 'Chetan Roy', r: 'Read-only Staff', s: 'Active', l: '1 week ago' }])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Operator')
  return (
    <>
      <PageHeader title="Staff" sub="6 of 50 staff seats used on your plan." actions={<Button icon={<I.UserPlus size={16} />} onClick={() => setOpen(true)}>Invite staff</Button>} />
      <Card><DataTable rows={staff} cols={[{ key: 'n', header: 'Name', mobile: 'title', render: (r) => <div className="flex items-center gap-3"><Avatar name={r.n} /><span className="font-medium">{r.n}</span></div> }, { key: 'r', header: 'Role', render: (r) => <Badge tone="brand" dot={false}>{r.r}</Badge> }, { key: 's', header: 'Status', render: (r) => <Status value={r.s} /> }, { key: 'l', header: 'Last active' }]} /></Card>
      <Card className="mt-4 p-5"><h3 className="font-semibold mb-3">Role permissions</h3><div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]"><thead><tr className="text-xs uppercase tracking-wide text-ng-mute text-left"><th className="py-2">Role</th>{['View', 'Create', 'Edit', 'Delete', 'Approve', 'Export', 'Send msgs'].map((p) => <th key={p} className="text-center">{p}</th>)}</tr></thead><tbody>{[['Owner', 1, 1, 1, 1, 1, 1, 1], ['Admin', 1, 1, 1, 1, 1, 1, 1], ['Manager', 1, 1, 1, 0, 1, 1, 1], ['Operator', 1, 1, 1, 0, 0, 0, 1], ['Accountant', 1, 1, 1, 0, 0, 1, 0], ['Read-only', 1, 0, 0, 0, 0, 0, 0]].map((r) => <tr key={r[0] as string} className="border-t border-ng-line"><td className="py-2.5 font-medium">{r[0]}</td>{r.slice(1).map((v, i) => <td key={i} className="text-center">{v ? <I.Check size={15} className="inline text-ng-ok" /> : <I.Minus size={15} className="inline text-slate-300" />}</td>)}</tr>)}</tbody></table></div></Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Invite staff member" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!/^\S+@\S+\.\S+$/.test(email)} onClick={() => { setStaff([...staff, { id: Date.now(), n: email.split('@')[0], r: role, s: 'Pending', l: 'Invited' }]); setOpen(false); setEmail(''); toast('Invitation sent') }}>Send invite</Button></>}>
        <div className="space-y-4"><Field label="Work email"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@organisation.com" /></Field><Field label="Role"><Select value={role} onChange={(e) => setRole(e.target.value)}>{['Organisation Admin', 'Manager', 'Operator', 'Accountant', 'Read-only Staff'].map((r) => <option key={r}>{r}</option>)}</Select></Field></div>
      </Modal>
    </>
  )
}

/* ---------- Operations hub + module pages ---------- */
export function OperationsPage({ ind }: { ind: Ind }) {
  return (
    <>
      <PageHeader title="Operations" sub={`Modules in your ${tenant[ind].label} package. Other industries' modules are never shown here.`} />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {modules[ind].map(([k, l, Ic], i) => <Link key={k} to={`/app/${ind}/m/${k}`} className="animate-rise" style={{ animationDelay: i * 60 + 'ms' }}><Card hover className="p-5 h-full"><span className="size-11 rounded-xl bg-ng-midnight text-ng-lime grid place-items-center"><Ic size={22} /></span><div className="mt-4 font-semibold">{l}</div><div className="text-sm text-ng-mute mt-1">Open {l.toLowerCase()} workspace</div></Card></Link>)}
      </div>
    </>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Simple({ title, sub, rows, cols, action }: { title: string; sub: string; rows: any[]; cols: { key: string; header: string; render?: (r: never) => ReactNode; mobile?: 'title' | 'hide' }[]; action?: ReactNode }) {
  const [q, setQ] = useState('')
  const loading = useFakeLoad(550, [title])
  const filtered = rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title={title} sub={sub} actions={action} />
      <Card><div className="p-4 border-b border-ng-line"><SearchBox value={q} onChange={setQ} placeholder={`Search ${title.toLowerCase()}`} className="md:w-80" /></div><DataTable loading={loading} rows={filtered} cols={cols as never} /></Card>
    </>
  )
}

function AttendancePage({ ind }: { ind: Ind }) {
  const toast = useToast()
  const people = ind === 'gym' ? members.slice(0, 6).map((m) => m.name) : students.map((s) => s.name)
  const [marks, setMarks] = useState<Record<string, string>>({})
  return (
    <>
      <PageHeader title="Attendance" sub={ind === 'gym' ? 'Today · Main floor' : 'B.Tech CSE · Section A · Today'} actions={<><Button variant="secondary" onClick={() => setMarks(Object.fromEntries(people.map((p) => [p, 'Present'])))}>Mark all present</Button><Button onClick={() => toast(`Attendance saved for ${Object.keys(marks).length} people`)} disabled={!Object.keys(marks).length}>Save</Button></>} />
      <Card className="divide-y divide-ng-line">{people.map((p) => <div key={p} className="flex items-center gap-3 p-4"><Avatar name={p} /><span className="flex-1 font-medium">{p}</span>{marks[p] && <span className="hidden sm:block"><Status value={marks[p]} /></span>}<div className="inline-flex rounded-lg border border-ng-line p-0.5">{['Present', 'Late', 'Absent'].map((m) => <button key={m} onClick={() => setMarks({ ...marks, [p]: m })} className={cx('h-8 px-3 text-xs sm:text-[13px] rounded-md font-medium cursor-pointer transition', marks[p] === m ? (m === 'Absent' ? 'bg-ng-err text-white' : m === 'Late' ? 'bg-ng-warn text-white' : 'bg-ng-ok text-white') : 'text-ng-mute hover:bg-ng-canvas')}>{m}</button>)}</div></div>)}</Card>
    </>
  )
}

function TimetablePage() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const slots = ['09:00', '10:00', '11:15', '12:15', '14:00']
  const subj = ['Data Structures', 'Maths III', 'DBMS', 'Networks', 'OS Lab', 'Elective', 'Free']
  return (
    <>
      <PageHeader title="Timetables" sub="B.Tech CSE · Semester 4 · Section A" actions={<Select className="!w-44" aria-label="Class"><option>CSE · Sec A</option><option>CSE · Sec B</option></Select>} />
      <Card className="overflow-x-auto"><div className="min-w-[640px] grid grid-cols-[72px_repeat(5,1fr)] text-sm"><div />{days.map((d) => <div key={d} className="p-3 text-center font-semibold border-b border-ng-line">{d}</div>)}{slots.map((s, r) => <div key={s} className="contents"><div className="p-3 text-xs text-ng-mute border-b border-ng-line/60">{s}</div>{days.map((d, c) => { const sb = subj[(r * 2 + c * 3) % subj.length]; return <div key={d + s} className="p-1.5 border-b border-ng-line/60"><div className={cx('h-full rounded-lg px-2.5 py-2 text-[13px] font-medium', sb === 'Free' ? 'text-ng-mute bg-ng-canvas' : 'bg-ng-tint text-ng-indigo-d hover:shadow-ng-md transition cursor-pointer')}>{sb}</div></div> })}</div>)}</div></Card>
    </>
  )
}

export function TransportPage({ ind }: { ind: Ind }) {
  const [bus, setBus] = useState('Bus 14')
  const rows = students.filter((s) => s.bus === bus)
  const buses = ['Bus 03', 'Bus 07', 'Bus 14', 'Bus 22']
  return (
    <>
      <PageHeader title="Transport" sub="80 buses · 312 stops · 4,860 students allocated" actions={<Button icon={<I.Megaphone size={16} />} onClick={() => go(`/app/${ind}/comms?audience=bus14`)}>Announce to {bus}</Button>} />
      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        <Card className="p-2 h-fit"><div className="px-3 py-2 text-xs uppercase tracking-wide text-ng-mute">Buses</div>{buses.map((b) => <button key={b} onClick={() => setBus(b)} className={cx('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left cursor-pointer transition', bus === b ? 'bg-ng-tint text-ng-indigo-d' : 'hover:bg-ng-canvas')}><I.Bus size={17} />{b}<span className="ml-auto text-xs text-ng-mute">{students.filter((s) => s.bus === b).length * 8 + 6} students</span></button>)}</Card>
        <div className="space-y-4">
          <Card><CardHeader title={`${bus} · Route`} sub="Morning pickup" action={<Badge tone="warn">Timing change pending</Badge>} /><ol className="p-5 relative">{busStops.map(([s, t], i) => <li key={s} className="flex gap-4 pb-5 last:pb-0 relative"><div className="flex flex-col items-center"><span className={cx('size-3 rounded-full ring-4 mt-1', i === busStops.length - 1 ? 'bg-ng-indigo ring-ng-tint' : 'bg-white border-2 border-ng-indigo ring-white')} />{i < busStops.length - 1 && <span className="flex-1 w-px bg-ng-line my-1" />}</div><div className="flex-1 flex justify-between text-sm -mt-0.5"><span className="font-medium">{s}</span><span className="text-ng-mute font-mono text-xs">{t}</span></div></li>)}</ol></Card>
          <Card><CardHeader title="Allocated students" sub="Each student and guardian receives messages individually" /><DataTable rows={rows} empty={<EmptyState title="No students allocated" body="Allocate students to this bus to include them in route announcements." action={<Button variant="secondary">Allocate students</Button>} />} cols={[{ key: 'name', header: 'Student', mobile: 'title', render: (s) => <span className="font-medium">{s.name}</span> }, { key: 'klass', header: 'Class' }, { key: 'guardian', header: 'Guardian' }]} /></Card>
        </div>
      </div>
    </>
  )
}

export function ModulePage({ ind, k }: { ind: Ind; k: string }) {
  const toast = useToast()
  const add = <Button icon={<I.Plus size={16} />} onClick={() => toast('Create form opened (prototype)', 'info')}>Add</Button>
  if (k === 'attendance') return <AttendancePage ind={ind} />
  if (k === 'timetables') return <TimetablePage />
  if (k === 'transport') return <TransportPage ind={ind} />
  if (k === 'members') return <Simple title="Members" sub="1,240 active members" action={add} rows={members} cols={[{ key: 'name', header: 'Member', mobile: 'title', render: (r: (typeof members)[0]) => <div className="flex items-center gap-3"><Avatar name={r.name} /><span className="font-medium">{r.name}</span></div> }, { key: 'plan', header: 'Plan' }, { key: 'trainer', header: 'Trainer' }, { key: 'expiry', header: 'Expires' }, { key: 'status', header: 'Status', render: (r: (typeof members)[0]) => <Status value={r.status} /> }]} />
  if (k === 'memberships') return <Simple title="Membership plans" sub="Sample prices" action={add} rows={[{ id: 1, n: 'Monthly', p: inr(1800), d: '30 days', m: 412 }, { id: 2, n: 'Quarterly Pro', p: inr(4800), d: '90 days', m: 388 }, { id: 3, n: 'Annual Elite', p: inr(16000), d: '365 days', m: 440 }]} cols={[{ key: 'n', header: 'Plan', mobile: 'title' }, { key: 'p', header: 'Price' }, { key: 'd', header: 'Duration' }, { key: 'm', header: 'Members' }]} />
  if (k === 'trainers') return <Simple title="Trainers" sub="4 trainers · 2 personal-training slots free today" action={add} rows={[{ id: 1, n: 'Neha Iyer', s: 'Strength & conditioning', c: 62 }, { id: 2, n: 'Karan Joshi', s: 'Yoga & mobility', c: 48 }, { id: 3, n: 'Samir Khan', s: 'Weight loss', c: 55 }]} cols={[{ key: 'n', header: 'Trainer', mobile: 'title', render: (r: { n: string }) => <div className="flex items-center gap-3"><Avatar name={r.n} /><span className="font-medium">{r.n}</span></div> }, { key: 's', header: 'Speciality' }, { key: 'c', header: 'Clients' }]} />
  if (k === 'renewals') return <RenewalsPage ind={ind} />
  if (k === 'students') return <Simple title="Students" sub="8,420 enrolled" action={add} rows={students} cols={[{ key: 'name', header: 'Student', mobile: 'title', render: (r: (typeof students)[0]) => <div className="flex items-center gap-3"><Avatar name={r.name} /><span className="font-medium">{r.name}</span></div> }, { key: 'klass', header: 'Class' }, { key: 'bus', header: 'Bus' }, { key: 'att', header: 'Attendance' }, { key: 'fee', header: 'Fees', render: (r: (typeof students)[0]) => <Status value={r.fee} /> }]} />
  if (k === 'parents') return <Simple title="Parents & guardians" sub="Contacts only. They never get a login." rows={students.map((s) => ({ id: s.id, g: s.guardian, c: s.name, b: s.bus }))} cols={[{ key: 'g', header: 'Guardian', mobile: 'title' }, { key: 'c', header: 'Child' }, { key: 'b', header: 'Bus' }, { key: 'p', header: 'Preferred channel', render: () => 'WhatsApp' }]} />
  if (k === 'teachers') return <Simple title="Teachers" sub="62 staff" action={add} rows={[{ id: 1, n: 'Dr. Meena Iyer', d: 'Computer Science', c: 4 }, { id: 2, n: 'Prof. Rakesh Kumar', d: 'Mathematics', c: 5 }, { id: 3, n: 'Dr. Sana Qureshi', d: 'Electronics', c: 3 }]} cols={[{ key: 'n', header: 'Teacher', mobile: 'title' }, { key: 'd', header: 'Department' }, { key: 'c', header: 'Classes' }]} />
  if (k === 'classes') return <Simple title="Classes & sections" sub="Academic year 2025–26" action={add} rows={[{ id: 1, n: 'B.Tech CSE', s: 'A, B', st: 240 }, { id: 2, n: 'B.Tech ECE', s: 'A, B', st: 180 }, { id: 3, n: 'MBA', s: 'A', st: 90 }]} cols={[{ key: 'n', header: 'Class', mobile: 'title' }, { key: 's', header: 'Sections' }, { key: 'st', header: 'Students' }]} />
  if (k === 'fees') return <Simple title="Fees" sub="Term 2 collection" rows={students.map((s) => ({ id: s.id, n: s.name, a: inr(42500), s: s.fee }))} cols={[{ key: 'n', header: 'Student', mobile: 'title' }, { key: 'a', header: 'Amount' }, { key: 's', header: 'Status', render: (r: { s: string }) => <Status value={r.s} /> }]} action={<Button icon={<I.Send size={16} />} variant="secondary" onClick={() => go(`/app/${ind}/comms`)}>Send reminders</Button>} />
  if (k === 'examinations') return <Simple title="Examinations" sub="Mid-semester schedule" action={add} rows={[{ id: 1, n: 'Data Structures', d: '12 Jun', h: 'Hall A', s: 'Scheduled' }, { id: 2, n: 'Maths III', d: '14 Jun', h: 'Hall B', s: 'Scheduled' }, { id: 3, n: 'DBMS', d: '17 Jun', h: 'Hall A', s: 'Draft' }]} cols={[{ key: 'n', header: 'Exam', mobile: 'title' }, { key: 'd', header: 'Date' }, { key: 'h', header: 'Venue' }, { key: 's', header: 'Status', render: (r: { s: string }) => <Status value={r.s} /> }]} />
  const label = modules[ind].find((m) => m[0] === k)?.[1] ?? 'Module'
  return (
    <>
      <PageHeader title={label} sub={`${tenant[ind].label} module`} />
      <Card><EmptyState title={`${label} is in the module catalogue`} body="This module reuses the same list, form and communication patterns shown in Gym and Education. It is not detailed in this prototype." action={<Link to="/design"><Button variant="secondary">View design system</Button></Link>} /></Card>
    </>
  )
}

function RenewalsPage({ ind }: { ind: Ind }) {
  const [tab, setTab] = useState('due')
  const rows = members.filter((m) => (tab === 'due' ? m.status === 'Due' : tab === 'overdue' ? m.status === 'Overdue' : true))
  return (
    <>
      <PageHeader title="Renewals" sub="Expiring memberships and reminder status" actions={<Button icon={<I.Send size={16} />} onClick={() => go(`/app/${ind}/comms`)}>Send reminders</Button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'due', label: 'Due soon', count: 2 }, { id: 'overdue', label: 'Overdue', count: 1 }, { id: 'all', label: 'All' }]} />
      <Card className="mt-5"><DataTable rows={rows} cols={[{ key: 'name', header: 'Member', mobile: 'title', render: (r) => <span className="font-medium">{r.name}</span> }, { key: 'plan', header: 'Plan' }, { key: 'expiry', header: 'Expires' }, { key: 'status', header: 'Status', render: (r) => <Status value={r.status} /> }]} /></Card>
    </>
  )
}

/* ---------- Payments / Reports / Automation / Settings ---------- */
export function PaymentsPage() {
  const [tab, setTab] = useState('all')
  const all = [{ id: 1, n: 'Diya Sharma', a: inr(5400), m: 'UPI', s: 'Paid', d: 'Today' }, { id: 2, n: 'Rohit Bansal', a: inr(42500), m: 'Bank transfer', s: 'Due', d: '28 May' }, { id: 3, n: 'Yash Malhotra', a: inr(42500), m: '—', s: 'Overdue', d: '10 May' }, { id: 4, n: 'Aarav Kapoor', a: inr(16000), m: 'Card', s: 'Paid', d: 'Yesterday' }]
  const rows = all.filter((r) => tab === 'all' || r.s.toLowerCase() === tab)
  return (
    <>
      <PageHeader title="Payments" sub="Payment status comes from verified gateway events or manual entries marked as such." actions={<Button icon={<I.Plus size={16} />}>Record payment</Button>} />
      <div className="grid sm:grid-cols-3 gap-4 mb-4"><Stat label="Collected" value="₹4.2L" delta="+9%" icon={<I.CircleCheck size={18} />} /><Stat label="Pending" value="₹1.1L" icon={<I.Clock size={18} />} /><Stat label="Overdue" value="₹42.5K" icon={<I.TriangleAlert size={18} />} /></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All' }, { id: 'paid', label: 'Paid' }, { id: 'due', label: 'Due' }, { id: 'overdue', label: 'Overdue' }]} />
      <Card className="mt-5"><DataTable rows={rows} cols={[{ key: 'n', header: 'Person', mobile: 'title', render: (r) => <span className="font-medium">{r.n}</span> }, { key: 'a', header: 'Amount' }, { key: 'm', header: 'Method' }, { key: 'd', header: 'Date' }, { key: 's', header: 'Status', render: (r) => <Status value={r.s} /> }]} /></Card>
    </>
  )
}
export function ReportsPage() {
  const toast = useToast()
  return (
    <>
      <PageHeader title="Reports" sub="Operational and financial insight." actions={<Button variant="secondary" icon={<I.Download size={16} />} onClick={() => toast('Report exported as CSV')}>Export</Button>} />
      <div className="grid xl:grid-cols-2 gap-4">
        <Card><CardHeader title="Collections by month" sub="₹ thousand" /><div className="p-5"><BarChart data={[310, 340, 295, 380, 420, 405]} labels={['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']} format={(v) => `₹${v}k`} /></div></Card>
        <Card><CardHeader title="Message outcomes" /><div className="p-5"><Donut center={<div className="text-sm text-ng-mute">30 days</div>} parts={[{ label: 'Delivered', value: 94, color: '#08090b' }, { label: 'Read', value: 61, color: '#cdf22b' }, { label: 'Failed', value: 4, color: '#E5484D' }]} /></div></Card>
      </div>
    </>
  )
}
export function AutomationPage({ ind }: { ind: Ind }) {
  const toast = useToast()
  const [wf, setWf] = useState([['Renewal reminder', '7 days before expiry → WhatsApp, SMS fallback', true], ['Fee due reminder', '3 days before due date → SMS', true], ['Birthday greeting', 'On birthday → WhatsApp', false], ['Route change alert', 'When a bus timing changes → affected guardians', ind === 'education']] as [string, string, boolean][])
  return (
    <>
      <PageHeader title="Automation" sub="Rules run on a queue with consent and rate limits applied." actions={<Button icon={<I.Plus size={16} />}>New workflow</Button>} />
      <div className="space-y-3">{wf.map(([n, d, on], i) => <Card key={n} hover className="p-5 flex items-center gap-4"><span className="size-11 rounded-xl bg-ng-midnight text-ng-lime grid place-items-center"><I.Zap size={20} /></span><div className="flex-1"><div className="font-semibold">{n}</div><div className="text-sm text-ng-mute">{d}</div></div><Toggle on={on} label={n} onChange={(v) => { setWf(wf.map((w, j) => (j === i ? [w[0], w[1], v] : w))); toast(`${n} ${v ? 'enabled' : 'paused'}`, 'info') }} /></Card>)}</div>
    </>
  )
}
export function SettingsPage({ ind }: { ind: Ind }) {
  const [tab, setTab] = useState('org')
  const toast = useToast()
  const [wl] = useState(false)
  return (
    <>
      <PageHeader title="Settings" sub={tenant[ind].name} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'org', label: 'Organisation' }, { id: 'brand', label: 'Branding' }, { id: 'channels', label: 'Channels' }, { id: 'data', label: 'Data & privacy' }]} />
      <div key={tab} className="mt-6 animate-fade max-w-2xl">
        {tab === 'org' && <Card className="p-5 grid sm:grid-cols-2 gap-4"><Field label="Organisation name"><Input defaultValue={tenant[ind].name} /></Field><Field label="Industry category" hint="Locked. Only NOVAGRID can change it."><Input value={tenant[ind].label} disabled readOnly /></Field><Field label="Time zone"><Select><option>Asia/Kolkata</option></Select></Field><Field label="Currency"><Select><option>INR (₹)</option></Select></Field><div className="sm:col-span-2"><Button onClick={() => toast('Settings saved')}>Save changes</Button></div></Card>}
        {tab === 'brand' && <Card className="p-5">{!wl && <div className="rounded-xl bg-gradient-to-br from-ng-tint to-white border border-ng-indigo/20 p-5 flex gap-4 items-start"><span className="size-10 rounded-lg bg-ng-indigo text-ng-midnight grid place-items-center shrink-0"><I.Crown size={20} /></span><div><div className="font-semibold">White-label is a premium add-on</div><p className="text-sm text-ng-mute mt-1">Use your own logo, colours and domain. Sample price: ₹1,999 / month.</p><Button size="sm" className="mt-3" onClick={() => go(`/app/${ind}/billing`)}>View add-ons</Button></div></div>}<div className="mt-5 opacity-50 pointer-events-none grid sm:grid-cols-2 gap-4"><Field label="Logo"><Input type="file" /></Field><Field label="Brand colour"><Input defaultValue="#635BFF" /></Field></div></Card>}
        {tab === 'channels' && <Card className="divide-y divide-ng-line">{[['MessageCircle', 'WhatsApp Business', 'Not connected', 'Requires your own Meta Business account'], ['Smartphone', 'SMS', 'Not connected', 'Requires DLT-registered sender and templates'], ['Mail', 'Email', 'Not connected', 'Requires a verified sending domain']].map(([ic, a, b, c]) => { const C = (I as unknown as Record<string, I.LucideIcon>)[ic]; return <div key={a} className="p-5 flex items-center gap-4"><C className="text-ng-indigo-d" /><div className="flex-1"><div className="font-medium">{a}</div><div className="text-xs text-ng-mute">{c}</div></div><Badge tone="neutral">{b}</Badge><Button size="sm" variant="secondary">Connect</Button></div> })}</Card>}
        {tab === 'data' && <Card className="p-5 space-y-5">{[['Mask phone numbers by default', true], ['Require consent record before messaging', true], ['Auto-delete message logs after 12 months', false]].map(([l, v]) => <div key={l as string} className="flex items-center justify-between gap-4 text-sm">{l as string}<Toggle on={v as boolean} label={l as string} onChange={() => toast('Preference updated', 'info')} /></div>)}</Card>}
      </div>
    </>
  )
}

/* Live (Supabase) when the schema is installed and an organisation is selected; sample data otherwise. */
export function PeoplePage({ ind }: { ind: Ind }) {
  const tenant = useLiveTenant()
  return tenant ? <LivePeople key={tenant} tenantId={tenant} /> : <DemoPeoplePage ind={ind} />
}
export function StaffPage() {
  const tenant = useLiveTenant()
  return tenant ? <LiveStaff key={tenant} tenantId={tenant} /> : <DemoStaffPage />
}
