import { useState, type ReactNode } from 'react'
import * as I from 'lucide-react'
import { Link, go } from '../lib/router'
import { AreaChart, Avatar, Badge, BarChart, Button, Card, Confirm, DataTable, Donut, Dropdown, EmptyState, ErrorState, Field, Input, Logo, LogoMark, Modal, Select, Skel, Stat, Status, Tabs, Textarea, Toggle, cx, useToast, type Tone } from '../ui'
import { INTRO_KEY } from './Intro'

const strip = [['Index', '/design'], ['01 Brand', '/design/brand'], ['02 System', '/design/system'], ['10 Mobile', '/design/mobile'], ['11 Motion', '/design/motion']]
export function DesignLayout({ path, children }: { path: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-ng-line">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4"><Link to="/design" aria-label="Design index"><Logo size={26} /></Link><span className="hidden sm:block text-xs text-ng-mute border-l border-ng-line pl-4">Design system & prototype guide</span>
          <nav className="ml-auto flex gap-1 overflow-x-auto scrollbar-none">{strip.map(([l, to]) => <Link key={to} to={to} className={cx('px-3 py-1.5 rounded-lg text-sm whitespace-nowrap', path === to ? 'bg-ng-tint text-ng-indigo-d font-medium' : 'text-ng-mute hover:text-ng-ink')}>{l}</Link>)}</nav></div>
      </header>
      <main key={path} className="mx-auto max-w-6xl px-4 py-10 animate-fade">{children}</main>
    </div>
  )
}
const H = ({ n, title, sub }: { n: string; title: string; sub: string }) => <div className="mb-8"><div className="text-xs font-semibold tracking-widest text-ng-indigo-d">{n}</div><h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-1">{title}</h1><p className="text-ng-mute mt-2 max-w-2xl">{sub}</p></div>
const Block = ({ title, children, note }: { title: string; children: ReactNode; note?: string }) => <section className="mb-12"><h2 className="text-lg font-semibold">{title}</h2>{note && <p className="text-sm text-ng-mute mt-1">{note}</p>}<div className="mt-4">{children}</div></section>

export function DesignIndex() {
  const pages = [['01', 'Brand Identity', 'Logo, colour, type, iconography', '/design/brand', I.Sparkles], ['02', 'Design System', 'Components, states, charts', '/design/system', I.Component], ['03', 'Public Website', 'Cinematic dark marketing site, pricing, login, registration', '/', I.Globe], ['04', 'Platform Owner', 'Super-admin console, approvals, organisations', '/platform/overview', I.ShieldCheck], ['05', 'Organisation Workspace', 'Industry-aware workspace and navigation', '/app/education/overview', I.LayoutGrid], ['06', 'Gym Management', 'Members, renewals, attendance, trainers', '/app/gym/overview', I.Dumbbell], ['07', 'Education Management', 'Students, fees, transport, timetables', '/app/education/m/transport', I.GraduationCap], ['08', 'Notifications', 'Bus 14 announcement with live delivery status', '/app/education/comms?audience=bus14', I.MessageSquareText], ['09', 'Subscription & Billing', 'Plans, usage, add-ons, invoices (INR, sample)', '/app/education/billing', I.CreditCard], ['10', 'Mobile Experience', 'Desktop, tablet and mobile side by side', '/design/mobile', I.Smartphone], ['11', 'Motion & Prototype', 'Motion language and first-visit intro', '/design/motion', I.Clapperboard]] as const
  return (
    <>
      <H n="NOVAGRID" title="Design system and clickable prototype" sub="Eleven organised sections. Every link opens a working screen with sample data only. There is no backend." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pages.map(([n, t, d, to, Ic], i) => <Link key={n} to={to} className="animate-rise" style={{ animationDelay: i * 40 + 'ms' }}><Card hover className="p-5 h-full"><div className="flex justify-between"><span className="size-11 rounded-xl bg-ng-midnight text-ng-lime grid place-items-center"><Ic size={22} /></span><span className="text-2xl font-bold text-ng-line">{n}</span></div><div className="mt-4 font-semibold">{t}</div><div className="text-sm text-ng-mute mt-1">{d}</div></Card></Link>)}
      </div>
      <Card className="mt-8 p-5 text-sm text-ng-mute"><b className="text-ng-ink">Source of truth:</b> product rules come from <code>/docs</code> (PRD, module catalogue, security plan). Industry navigation never mixes: gym shows gym modules, education shows education modules, hospital and hotel appear as catalogue previews.</Card>
    </>
  )
}

export function BrandPage() {
  const colors = [['Midnight Black', '#08090B', 'text-white'], ['Charcoal', '#111316', 'text-white'], ['Graphite', '#1B1E22', 'text-white'], ['Neon Lime', '#CDF22B', 'text-ng-ink'], ['Lime Light', '#E6FF7A', 'text-ng-ink'], ['Lime Deep', '#A8CC12', 'text-ng-ink'], ['Soft Ivory', '#FAF8F3', 'text-ng-ink border border-ng-line'], ['White', '#FFFFFF', 'text-ng-ink border border-ng-line'], ['Olive (text on light)', '#4D6100', 'text-white'], ['Warm Grey (secondary)', '#6B6A63', 'text-white']]
  const type = [['Display', 'text-6xl font-extrabold tracking-tight', '68 / 1.02 · 800'], ['H1', 'text-4xl font-bold tracking-tight', '36 / 1.1 · 700'], ['H2', 'text-2xl font-bold', '24 / 1.25 · 700'], ['H3', 'text-lg font-semibold', '18 / 1.4 · 600'], ['Body', 'text-base', '16 / 1.6 · 400'], ['Small', 'text-sm text-ng-mute', '14 / 1.5 · 400'], ['Caption', 'text-xs uppercase tracking-widest font-semibold', '12 · 600 · +0.18em']] as const
  const icons = [I.LayoutGrid, I.Users, I.UserCog, I.MessageSquareText, I.CreditCard, I.ChartColumn, I.Zap, I.Settings, I.Bus, I.Dumbbell, I.GraduationCap, I.Stethoscope, I.BedDouble, I.ShieldCheck, I.Bell, I.CalendarDays]
  return (
    <>
      <H n="01" title="Brand identity" sub="A grid of nine cells with three awake. It reads as many operations running as one connected system." />
      <Block title="Logo"><div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-ng-midnight p-10 grid place-items-center"><Logo dark size={40} /></div>
        <div className="rounded-2xl bg-white border border-ng-line p-10 grid place-items-center"><Logo size={40} /></div>
        <div className="rounded-2xl bg-gradient-to-br from-ng-indigo to-ng-violet p-10 grid place-items-center gap-4"><LogoMark size={64} /><span className="text-white/80 text-xs tracking-widest">APP ICON</span></div>
      </div><p className="text-sm text-ng-mute mt-3">Wordmark: Inter ExtraBold, +14% tracking, “GRID” in Neon Lime (on light backgrounds it sits on a lime highlight). Clear space equals the height of one grid cell. Minimum size 24px (mark only).</p></Block>
      <Block title="Colour tokens" note="Public website: midnight black with neon lime highlights. Workspaces: soft ivory surfaces, midnight black structure, lime reserved for focus, active states and primary actions. Lime is never used as text on light backgrounds."><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{colors.map(([n, h, c]) => <div key={h} className={cx('rounded-xl p-4 h-28 flex flex-col justify-end', c)} style={{ background: h }}><div className="font-semibold text-sm">{n}</div><div className="font-mono text-xs opacity-80">{h}</div></div>)}</div>
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-3">{[['Success', '#0E9F6E'], ['Warning', '#D97706'], ['Error', '#E5484D'], ['Lime tint', '#F1F6D3'], ['Border', '#E8E4D9'], ['Ink', '#08090B']].map(([n, h]) => <div key={h} className="rounded-lg border border-ng-line bg-white p-2.5 flex gap-2 items-center"><span className="size-6 rounded-md shrink-0 border border-black/5" style={{ background: h }} /><div className="text-xs"><div className="font-medium">{n}</div><div className="font-mono text-ng-mute">{h}</div></div></div>)}</div></Block>
      <Block title="Typography" note="Inter for interface and marketing. JetBrains Mono for IDs, codes and masked numbers."><Card className="divide-y divide-ng-line">{type.map(([n, c, s]) => <div key={n} className="p-5 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8"><span className="w-20 text-xs text-ng-mute">{n}</span><span className={cx('flex-1', c)}>Every Operation. One Grid.</span><span className="text-xs font-mono text-ng-mute">{s}</span></div>)}</Card></Block>
      <Block title="Icon system" note="Lucide, 1.75px stroke, 18px in navigation and 16px inline. One icon per concept across industries."><div className="grid grid-cols-4 sm:grid-cols-8 gap-3">{icons.map((Ic, i) => <div key={i} className="aspect-square rounded-xl bg-white border border-ng-line grid place-items-center text-ng-indigo-d hover:bg-ng-indigo transition"><Ic size={22} /></div>)}</div></Block>
      <Block title="Spacing, radius and elevation"><div className="grid md:grid-cols-3 gap-4"><Card className="p-5"><div className="text-sm font-semibold mb-3">4px base scale</div>{[4, 8, 12, 16, 24, 32, 48].map((s) => <div key={s} className="flex items-center gap-3 mb-1.5"><span className="w-8 text-xs font-mono text-ng-mute">{s}</span><span className="h-2 rounded bg-ng-midnight/80" style={{ width: s * 2 }} /></div>)}</Card><Card className="p-5"><div className="text-sm font-semibold mb-3">Radius</div><div className="flex gap-3">{[['8', 'rounded-lg'], ['12', 'rounded-xl'], ['16', 'rounded-2xl']].map(([n, c]) => <div key={n} className={cx('size-16 bg-ng-tint border border-ng-indigo/30 grid place-items-center text-xs font-mono', c)}>{n}</div>)}</div><p className="text-xs text-ng-mute mt-3">Controls 8 · panels 16 · modals 16–24</p></Card><Card className="p-5"><div className="text-sm font-semibold mb-3">Elevation</div><div className="flex gap-4">{['shadow-ng-sm', 'shadow-ng-md', 'shadow-ng-lg'].map((s) => <div key={s} className={cx('size-16 rounded-xl bg-white grid place-items-center text-[10px] font-mono', s)}>{s.slice(10)}</div>)}</div></Card></div></Block>
    </>
  )
}

export function SystemPage() {
  const toast = useToast()
  const [modal, setModal] = useState(false)
  const [conf, setConf] = useState(false)
  const [tab, setTab] = useState('a')
  const [tg, setTg] = useState(true)
  const [replay, setReplay] = useState(0)
  const tones: Tone[] = ['ok', 'warn', 'err', 'info', 'brand', 'violet', 'neutral']
  return (
    <>
      <H n="02" title="Design system" sub="Every component used in the prototype, with its states. All are reusable code components." />
      <Block title="Buttons"><div className="flex flex-wrap gap-3 items-center"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button><Button loading>Loading</Button><Button disabled>Disabled</Button><Button size="sm">Small</Button><Button size="lg" icon={<I.Send size={16} />}>Large with icon</Button><span className="bg-ng-midnight p-3 rounded-xl flex gap-3"><Button variant="dark">On dark</Button><Button variant="outline-dark">Outline</Button></span></div></Block>
      <Block title="Inputs"><div className="grid md:grid-cols-3 gap-4 max-w-4xl"><Field label="Default" hint="Helper text"><Input placeholder="Placeholder" /></Field><Field label="Error" error="This field is required"><Input invalid defaultValue="invalid" /></Field><Field label="Select"><Select><option>Option one</option></Select></Field><div className="md:col-span-2"><Field label="Textarea"><Textarea rows={3} /></Field></div><div className="flex items-end gap-3 pb-2"><Toggle on={tg} onChange={setTg} label="Toggle" /><span className="text-sm text-ng-mute">Toggle</span></div></div></Block>
      <Block title="Status badges"><div className="flex flex-wrap gap-2">{tones.map((t) => <Badge key={t} tone={t}>{t}</Badge>)}</div><div className="flex flex-wrap gap-2 mt-3">{['Active', 'Pending', 'Suspended', 'Delivered', 'Read', 'Failed', 'Retrying', 'Scheduled', 'Opted in', 'Overdue'].map((s) => <Status key={s} value={s} />)}</div></Block>
      <Block title="Cards and statistics"><div className="grid sm:grid-cols-3 gap-4"><Stat label="Members" value="1,240" delta="+4.8%" icon={<I.Users size={18} />} /><Stat label="Dues" value="₹18.4L" delta="-3.2%" icon={<I.Wallet size={18} />} /><Card hover className="p-5"><div className="font-semibold">Hover card</div><p className="text-sm text-ng-mute mt-1">Lifts 4px with an indigo hairline.</p></Card></div></Block>
      <Block title="Navigation, tabs, menus and overlays"><div className="space-y-4"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'a', label: 'Overview' }, { id: 'b', label: 'Activity', count: 4 }, { id: 'c', label: 'Settings' }]} /><div className="flex flex-wrap gap-3"><Dropdown align="left" label="Menu" trigger={<span className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-ng-line bg-white text-sm font-semibold">Dropdown <I.ChevronDown size={15} /></span>} items={[{ label: 'Edit', icon: <I.Pencil size={15} /> }, { label: 'Duplicate', icon: <I.Copy size={15} /> }, { divider: true, label: '' }, { label: 'Delete', icon: <I.Trash2 size={15} />, danger: true }]} /><Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button><Button variant="secondary" onClick={() => setConf(true)}>Confirm dialog</Button><Button variant="secondary" onClick={() => toast('Saved successfully')}>Success toast</Button><Button variant="secondary" onClick={() => toast('Could not save changes', 'err')}>Error toast</Button></div></div></Block>
      <Block title="Data table" note="Rows become labelled cards below 768px."><Card><DataTable rows={[{ id: 1, n: 'Aarav Kapoor', p: 'Annual Elite', s: 'Active' }, { id: 2, n: 'Diya Sharma', p: 'Quarterly Pro', s: 'Due' }]} cols={[{ key: 'n', header: 'Member', mobile: 'title', render: (r) => <div className="flex items-center gap-3"><Avatar name={r.n} />{r.n}</div> }, { key: 'p', header: 'Plan' }, { key: 's', header: 'Status', render: (r) => <Status value={r.s} /> }]} /></Card></Block>
      <Block title="Loading, empty and error states"><div className="grid md:grid-cols-3 gap-4"><Card className="p-5 space-y-3"><Skel className="h-5 w-1/2" /><Skel className="h-12" /><Skel className="h-12" /></Card><Card><EmptyState title="Nothing here yet" body="Add your first record to get started." action={<Button size="sm">Add record</Button>} /></Card><Card><ErrorState onRetry={() => toast('Retrying…', 'info')} /></Card></div></Block>
      <Block title="Charts" note="SVG, animated on mount, tooltips on hover."><div className="grid lg:grid-cols-3 gap-4"><Card className="p-5"><div className="flex justify-between mb-2"><b className="text-sm">Area</b><button onClick={() => setReplay(replay + 1)} className="text-xs text-ng-indigo-d cursor-pointer">Replay</button></div><AreaChart key={replay} data={[12, 18, 15, 24, 30, 28, 40]} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} /></Card><Card className="p-5"><b className="text-sm">Bars</b><div className="mt-4"><BarChart key={replay} data={[12, 18, 15, 24, 30, 28, 40]} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} /></div></Card><Card className="p-5"><b className="text-sm">Donut</b><div className="mt-4"><Donut key={replay} parts={[{ label: 'A', value: 50, color: '#08090b' }, { label: 'B', value: 30, color: '#cdf22b' }, { label: 'C', value: 20, color: '#7d9a0a' }]} /></div></Card></div></Block>
      <Modal open={modal} onClose={() => setModal(false)} title="Modal title" footer={<><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button onClick={() => setModal(false)}>Save</Button></>}><p className="text-sm text-ng-mute">Centered on desktop and a bottom sheet on mobile. Closes on Escape or backdrop click.</p></Modal>
      <Confirm danger open={conf} onClose={() => setConf(false)} onConfirm={() => toast('Deleted')} title="Delete record?" body="This cannot be undone." confirmLabel="Delete" />
    </>
  )
}

export function MobilePage() {
  const screens = [['Workspace overview', '/app/education/overview'], ['People', '/app/education/people'], ['Compose message', '/app/education/comms?audience=bus14'], ['Transport', '/app/education/m/transport'], ['Billing', '/app/education/billing'], ['Platform overview', '/platform/overview'], ['Organisations', '/platform/organisations'], ['Public homepage', '/product'], ['Registration', '/register']]
  const [i, setI] = useState(0)
  const src = (r: string) => `${window.location.pathname}#${r}`
  const frames = [['Mobile · 390', 390, 800, 0.85], ['Tablet · 768', 768, 900, 0.62], ['Desktop · 1440', 1440, 900, 0.34]] as const
  return (
    <>
      <H n="10" title="Mobile experience" sub="The same screen at three breakpoints. Each frame is a live prototype, so you can click through. Mobile gets a bottom tab bar and card lists, tablet a collapsed icon rail, desktop the full sidebar." />
      <div className="flex flex-wrap gap-1.5 mb-8">{screens.map(([l], n) => <button key={l} onClick={() => setI(n)} className={cx('h-9 px-3.5 rounded-full text-sm border cursor-pointer transition', i === n ? 'bg-ng-indigo text-ng-midnight border-ng-indigo' : 'bg-white border-ng-line text-ng-mute')}>{l}</button>)}</div>
      <div className="flex gap-8 overflow-x-auto pb-6 items-start">
        {frames.map(([l, w, h, s]) => (
          <div key={l} className="shrink-0"><div className="text-sm font-medium mb-3">{l}</div>
            <div className="rounded-[1.6rem] bg-ng-midnight p-2 shadow-ng-lg overflow-hidden" style={{ width: w * s + 16, height: h * s + 16 }}>
              <div className="rounded-[1.2rem] overflow-hidden bg-white" style={{ width: w * s, height: h * s }}><iframe key={l + i} title={l} src={src(screens[i][1])} style={{ width: w, height: h, border: 0, transform: `scale(${s})`, transformOrigin: 'top left' }} /></div>
            </div></div>
        ))}
      </div>
      <Block title="Responsive rules"><div className="grid md:grid-cols-3 gap-4 text-sm">{[['Mobile 390', 'Bottom tab bar (Home, People, Messages, Payments, More). Drawer for the full menu. Tables become cards. Modals become bottom sheets. Primary actions sit within thumb reach.'], ['Tablet 768', 'Collapsed 72px icon rail with tooltips. Two-column dashboard grids. Tables remain tables.'], ['Desktop 1440', 'Full 260px sidebar with module group, global search, up to four stat columns, sticky preview in the composer.']].map(([t, b]) => <Card key={t} className="p-5"><div className="font-semibold">{t}</div><p className="text-ng-mute mt-2 leading-relaxed">{b}</p></Card>)}</div></Block>
    </>
  )
}

export function MotionPage() {
  const [run, setRun] = useState(0)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const toast = useToast()
  return (
    <>
      <H n="11" title="Motion & prototype" sub="Purposeful motion: it explains hierarchy and state change. It never blocks work, and it respects reduced-motion settings." />
      <Block title="First-visit intro" note="Dark, grid awakens, NOVAGRID types, candle-wax melt, glowing particles, homepage reveal (about 7s, skippable)."><Card className="p-6 flex flex-col md:flex-row gap-5 md:items-center justify-between"><div className="text-sm text-ng-mute max-w-xl">Plays on the very first visit to the homepage only. A flag (<code className="text-ng-ink">{INTRO_KEY}</code>) is stored in localStorage so refreshes skip it. Reduced-motion users never see it.</div><div className="flex gap-2 flex-wrap"><Button icon={<I.Play size={16} />} onClick={() => go('/intro')}>Play intro</Button><Button variant="secondary" onClick={() => { localStorage.removeItem(INTRO_KEY); toast('Flag cleared. Open the homepage to see the first-visit behaviour.', 'info') }}>Reset first-visit flag</Button><Button variant="secondary" onClick={() => go('/')}>Open homepage</Button></div></Card></Block>
      <Block title="Timeline"><div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">{[['0.0s', 'Grid awakens', 'Perspective grid fades in, cells pulse at random'], ['1.5s', 'Type-in', 'Letters appear with a sky-blue caret'], ['3.6s', 'Wax melt', 'Goo filter merges letters, drips elongate and fall'], ['5.0s', 'Glow', 'Indigo, violet and sky particles rise'], ['6.4s', 'Reveal', 'Overlay blurs and scales away to the homepage']].map(([t, a, b]) => <Card key={t} className="p-4"><div className="font-mono text-xs text-ng-indigo-d">{t}</div><div className="font-semibold mt-1">{a}</div><p className="text-ng-mute text-xs mt-1">{b}</p></Card>)}</div></Block>
      <Block title="Motion tokens"><Card className="overflow-x-auto"><table className="w-full text-sm min-w-[480px]"><tbody>{[['Entrance (rise)', '600ms', 'cubic-bezier(.2,.7,.2,1)', 'Page content, cards (staggered 60–70ms)'], ['Modal / sheet', '280–320ms', 'cubic-bezier(.2,.9,.3,1.1)', 'Centered pop, mobile bottom sheet'], ['Dropdown', '180ms', 'ease-out', 'Menus, popovers'], ['Hover elevation', '300ms', 'ease', 'Cards lift 4px, border turns indigo'], ['Chart draw', '900–1200ms', 'cubic-bezier(.3,.7,.2,1)', 'Lines draw, bars grow, donuts sweep'], ['Float (hero)', '7s loop', 'ease-in-out', 'Hero dashboard with 3D perspective']].map(([a, b, c, d]) => <tr key={a} className="border-b border-ng-line last:border-0"><td className="p-4 font-medium">{a}</td><td className="p-4 font-mono text-xs">{b}</td><td className="p-4 font-mono text-xs text-ng-mute hidden md:table-cell">{c}</td><td className="p-4 text-ng-mute">{d}</td></tr>)}</tbody></table></Card></Block>
      <Block title="Live demos"><div className="flex justify-end mb-3"><Button size="sm" variant="secondary" icon={<I.RotateCcw size={14} />} onClick={() => setRun(run + 1)}>Replay all</Button></div>
        <div className="grid md:grid-cols-3 gap-4" key={run}>
          <Card className="p-5"><div className="text-sm font-semibold mb-3">Staggered entrance</div>{[0, 1, 2, 3].map((i) => <div key={i} className="animate-rise h-9 rounded-lg bg-ng-tint mb-2" style={{ animationDelay: i * 90 + 'ms', width: 100 - i * 12 + '%' }} />)}</Card>
          <Card className="p-5"><div className="text-sm font-semibold mb-3">Animated chart</div><BarChart data={[20, 34, 28, 46, 38, 52]} labels={['a', 'b', 'c', 'd', 'e', 'f']} height={110} /></Card>
          <div onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -14, y: ((e.clientX - r.left) / r.width - 0.5) * 14 }) }} onMouseLeave={() => setTilt({ x: 0, y: 0 })} className="[perspective:700px]"><div className="h-full rounded-2xl bg-gradient-to-br from-ng-midnight to-ng-navy-2 p-5 text-white transition-transform duration-200" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}><div className="text-sm font-semibold">Subtle 3D tilt</div><p className="text-xs text-white/60 mt-1 mb-4">Move the cursor over this card. Max rotation 7°.</p><LogoMark size={44} /></div></div>
        </div></Block>
    </>
  )
}
