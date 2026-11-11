import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import * as I from 'lucide-react'
import { Link, go } from '../lib/router'
import { Badge, Button, Field, Input, Logo, Reveal, Select, Textarea, cx, useToast } from '../ui'
import { faqs, industries, inr, planTiers } from '../data'

const iconOf = (n: string) => (I as unknown as Record<string, I.LucideIcon>)[n] ?? I.Box

/* ---------- Layout ---------- */
const nav = [['Product', '/product'], ['Industries', '/industries'], ['Features', '/features'], ['Security', '/security'], ['Pricing', '/pricing'], ['Contact', '/contact']]
export function PublicLayout({ path, children }: { path: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-ng-midnight text-white min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ng-midnight/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
          <Link to="/" aria-label="NOVAGRID home"><Logo dark /></Link>
          <nav className="hidden lg:flex gap-1">
            {nav.map(([l, to]) => (
              <Link key={to} to={to} className={cx('px-3.5 py-2 text-sm rounded-lg transition', path === to ? 'text-white bg-white/10' : 'text-white/65 hover:text-white')}>{l}</Link>
            ))}
          </nav>
          <div className="hidden lg:flex gap-2">
            <Button variant="outline-dark" size="sm" onClick={() => go('/login')}>Log in</Button>
            <Button size="sm" onClick={() => go('/register')}>Start free trial</Button>
          </div>
          <button className="lg:hidden size-10 grid place-items-center rounded-lg hover:bg-white/10 cursor-pointer" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <I.X /> : <I.Menu />}</button>
        </div>
        {open && (
          <div className="lg:hidden border-t border-white/10 px-5 py-4 space-y-1 animate-drop bg-ng-midnight">
            {nav.map(([l, to]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="block py-3 text-lg text-white/80 border-b border-white/5">{l}</Link>)}
            <div className="grid grid-cols-2 gap-2 pt-4">
              <Button variant="outline-dark" onClick={() => go('/login')}>Log in</Button>
              <Button onClick={() => go('/register')}>Start free</Button>
            </div>
          </div>
        )}
      </header>
      <main key={path} className="animate-fade">{children}</main>
      <footer className="border-t border-white/10 mt-24">
        <div className="mx-auto max-w-7xl px-5 py-12 grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div><Logo dark /><p className="mt-4 text-sm text-white/50 max-w-xs">Every Operation. One Intelligent Grid.</p></div>
          {[['Product', ['Overview', 'Features', 'Pricing']], ['Industries', ['Gym', 'Education', 'Hospitality', 'Healthcare']], ['Company', ['Security', 'Contact', 'Design system']]].map(([h, ls]) => (
            <div key={h as string}><div className="text-sm font-semibold mb-3">{h as string}</div>{(ls as string[]).map((l) => <Link key={l} to={l === 'Design system' ? '/design' : '/' + l.toLowerCase()} className="block text-sm text-white/55 hover:text-white py-1">{l}</Link>)}</div>
          ))}
        </div>
        <div className="mx-auto max-w-7xl px-5 pb-8 text-xs text-white/40">© NOVAGRID. Design prototype with sample data. Prices shown are illustrative.</div>
      </footer>
    </div>
  )
}

/* ---------- Shared bits ---------- */
const Eyebrow = ({ children }: { children: ReactNode }) => <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ng-sky mb-3">{children}</div>
const Section = ({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub?: string; children: ReactNode }) => (
  <section className="mx-auto max-w-7xl px-5 pt-24">
    <Reveal className="max-w-2xl"><Eyebrow>{eyebrow}</Eyebrow><h2 className="text-3xl md:text-[42px] font-bold tracking-tight leading-[1.1]">{title}</h2>{sub && <p className="mt-4 text-lg text-white/60">{sub}</p>}</Reveal>
    <div className="mt-12">{children}</div>
  </section>
)

/* ---------- Hero ---------- */
function HeroDashboard() {
  const bars = [40, 62, 48, 80, 66, 92, 74]
  return (
    <div className="relative [perspective:1600px]">
      <div className="absolute -inset-10 bg-[radial-gradient(closest-side,rgba(205,242,43,.35),transparent)] blur-2xl" />
      <div className="relative animate-float [transform-style:preserve-3d]">
        <div className="rounded-2xl border border-white/15 bg-ng-navy shadow-[0_40px_120px_-20px_rgba(205,242,43,.5)] overflow-hidden [transform:rotateY(-12deg)_rotateX(5deg)]">
          <div className="flex items-center gap-1.5 px-4 h-9 border-b border-white/10">{[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full bg-white/20" />)}<span className="ml-3 text-[11px] text-white/40">app.novagrid.example / pulse-fitness</span></div>
          <div className="flex">
            <div className="hidden sm:block w-40 border-r border-white/10 p-3 space-y-1.5">
              {['Overview', 'Members', 'Attendance', 'Renewals', 'Messages'].map((l, i) => <div key={l} className={cx('h-8 rounded-md px-2.5 text-xs flex items-center', i === 0 ? 'bg-ng-indigo/25 text-white' : 'text-white/45')}>{l}</div>)}
            </div>
            <div className="flex-1 p-4 space-y-3 bg-ng-canvas/[0.03]">
              <div className="grid grid-cols-3 gap-2.5">
                {[['Members', '1,240'], ['Renewals due', '38'], ['Revenue', '₹4.2L']].map(([a, b]) => <div key={a} className="rounded-lg bg-white/[0.06] border border-white/10 p-3"><div className="text-[10px] text-white/50">{a}</div><div className="text-lg font-bold mt-1">{b}</div></div>)}
              </div>
              <div className="rounded-lg bg-white/[0.06] border border-white/10 p-3">
                <div className="text-[10px] text-white/50 mb-2">Weekly attendance</div>
                <div className="flex items-end gap-2 h-24">{bars.map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-ng-indigo to-ng-sky origin-bottom animate-grow" style={{ height: h + '%', animationDelay: 400 + i * 80 + 'ms' }} />)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -left-6 sm:-left-12 bottom-10 w-60 rounded-xl border border-white/15 bg-ng-navy-2/95 p-3.5 shadow-2xl [transform:translateZ(60px)] animate-rise" style={{ animationDelay: '1s' }}>
          <div className="flex items-center gap-2 text-xs text-white/60"><span className="size-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center"><I.MessageCircle size={13} /></span>WhatsApp · Bus 14</div>
          <div className="mt-2 text-sm">Delivered to <b>41 of 42</b> recipients</div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full w-[97%] rounded-full bg-gradient-to-r from-ng-indigo to-ng-sky" /></div>
        </div>
        <div className="absolute -right-8 -top-8 z-30 rounded-xl border border-white/15 bg-ng-navy-2 px-3.5 py-2.5 text-xs shadow-2xl [transform:translateZ(120px)] animate-rise" style={{ animationDelay: '1.3s' }}>
          <span className="text-ng-sky font-semibold">+12.4%</span> <span className="text-white/60">renewals this month</span>
        </div>
      </div>
    </div>
  )
}

export function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg [mask-image:radial-gradient(ellipse_at_50%_20%,#000_20%,transparent_70%)]" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[700px] rounded-full bg-ng-indigo/25 blur-[140px]" />
        <div className="relative mx-auto max-w-7xl px-5 pt-16 md:pt-24 grid lg:grid-cols-[1.05fr_1fr] gap-16 items-center">
          <div className="animate-rise">
            <Badge tone="brand">Every Operation. One Intelligent Grid.</Badge>
            <h1 className="mt-6 text-[40px] sm:text-6xl lg:text-[68px] font-extrabold tracking-tight leading-[1.02] text-gradient">One Intelligent Grid.<br />Complete Business Control.</h1>
            <p className="mt-6 text-lg text-white/65 max-w-xl leading-relaxed">Manage your entire organisation through one connected platform. Simplify operations, automate communication and make smarter decisions.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => go('/register')} icon={<I.ArrowRight size={18} />}>Start free trial</Button>
              <Button size="lg" variant="outline-dark" onClick={() => go('/product')} icon={<I.Play size={16} />}>Explore the product</Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/50">{['Private one-to-one messaging', 'Industry-specific workspaces', 'Tenant-isolated data'].map((t) => <span key={t} className="flex items-center gap-2"><I.Check size={15} className="text-ng-sky" />{t}</span>)}</div>
          </div>
          <div className="pb-10 lg:pb-0 px-2 sm:px-8"><HeroDashboard /></div>
        </div>
      </section>
      <ProductOverview />
      <IndustryShowcase />
      <FeatureGrid />
      <CommunicationSection />
      <SecuritySection />
      <PricingSection />
      <FaqSection />
      <CtaBand />
    </>
  )
}

/* ---------- Sections ---------- */
export function ProductOverview() {
  const pillars = [
    ['Network', 'One platform, many industries', 'A shared core for people, staff, payments and messaging, with an industry module layer on top.'],
    ['ShieldCheck', 'Approved modules only', 'Your category is approved by NOVAGRID, so your workspace shows only what belongs to your business.'],
    ['Send', 'Private by design', 'Every recipient is messaged individually. No groups, no exposed numbers.'],
  ]
  return (
    <Section eyebrow="Product" title="A connected grid for every kind of operation" sub="Core services are shared. Industry modules plug in. You get one clear workspace instead of a patchwork of tools.">
      <div className="grid md:grid-cols-3 gap-4">
        {pillars.map(([ic, t, b], i) => {
          const Ic = iconOf(ic)
          return (
            <Reveal key={t} delay={i * 90}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition duration-300 hover:-translate-y-1 hover:border-ng-indigo/50 hover:bg-white/[0.06]">
                <div className="size-11 rounded-xl bg-gradient-to-br from-ng-indigo to-ng-violet text-ng-midnight grid place-items-center"><Ic size={22} /></div>
                <h3 className="mt-5 text-lg font-semibold">{t}</h3><p className="mt-2 text-white/60 leading-relaxed">{b}</p>
              </div>
            </Reveal>
          )
        })}
      </div>
    </Section>
  )
}

export function IndustryShowcase() {
  return (
    <Section eyebrow="Industries" title="Built for how your industry actually works" sub="Twelve industry modules planned on one architecture. Gym and Education are fully designed in this prototype.">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {industries.map((x, i) => {
          const Ic = iconOf(x.icon)
          const live = x.phase.startsWith('Live')
          return (
            <Reveal key={x.key} delay={(i % 4) * 70}>
              <button onClick={() => go(live ? `/app/${x.key}/overview` : '/industries')} className="group w-full h-full text-left rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition duration-300 hover:-translate-y-1 hover:border-ng-sky/50 hover:[transform:perspective(800px)_rotateX(3deg)_translateY(-4px)] cursor-pointer">
                <Ic className="text-ng-sky group-hover:scale-110 transition" size={26} />
                <div className="mt-4 font-semibold">{x.name}</div>
                <p className="mt-1 text-[13px] text-white/50 leading-snug">{x.blurb}</p>
                <div className={cx('mt-3 text-[11px] font-semibold', live ? 'text-ng-sky' : 'text-white/35')}>{live ? 'Open workspace →' : 'In module catalogue'}</div>
              </button>
            </Reveal>
          )
        })}
      </div>
    </Section>
  )
}

export function FeatureGrid() {
  const f = [['Users', 'People & contacts', 'Members, students, patients and guests in one consent-aware directory.'], ['UserCog', 'Staff & roles', 'Six roles with fine-grained permissions and resource limits.'], ['CreditCard', 'Payments & billing', 'Track fees and dues, send reminders, reconcile from verified gateway events.'], ['CalendarClock', 'Scheduling', 'Timetables, shifts and appointments across branches.'], ['Workflow', 'Automation', 'Renewal reminders and route-change alerts run on rules you control.'], ['BarChart3', 'Reports', 'Operational and financial reports, exportable on demand.'], ['FileText', 'Documents', 'Private storage with validated uploads and signed links.'], ['Palette', 'White-label', 'Your brand across the workspace as a premium add-on.']]
  return (
    <Section eyebrow="Features" title="Everything shared, nothing duplicated">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/10 bg-white/10">
        {f.map(([ic, t, b], i) => { const Ic = iconOf(ic); return <Reveal key={t} delay={i * 50} className="bg-ng-midnight"><div className="p-6 h-full hover:bg-white/[0.04] transition"><Ic className="text-ng-indigo" size={24} /><h3 className="mt-4 font-semibold">{t}</h3><p className="mt-1.5 text-sm text-white/55 leading-relaxed">{b}</p></div></Reveal> })}
      </div>
    </Section>
  )
}

export function CommunicationSection() {
  const rows = [['Ananya P.', 'Delivered', 'emerald'], ['Suresh P. (parent)', 'Read', 'violet'], ['Rohit B.', 'Delivered', 'emerald'], ['Meghna D.', 'Sent', 'sky'], ['Pranab D. (parent)', 'Failed', 'red']]
  const tone: Record<string, string> = { emerald: 'text-emerald-400', violet: 'text-lime-300', sky: 'text-stone-300', red: 'text-red-400' }
  return (
    <Section eyebrow="Communication" title="Tell exactly the right people, privately" sub="Pick Bus 14. NOVAGRID finds only the students and guardians allocated to it and sends each a separate message.">
      <div className="grid lg:grid-cols-2 gap-6 items-center">
        <Reveal>
          <ul className="space-y-5">
            {[['MessageCircle', 'WhatsApp, SMS and email', 'Template-aware, consent-checked, rate limited.'], ['Users', 'Dynamic audiences', 'Segments update as data changes: routes, classes, renewals.'], ['ListChecks', 'Honest delivery status', 'Statuses come from provider callbacks, never assumed.'], ['RotateCw', 'Retries and failures', 'Transient errors retry. Permanent failures are surfaced to staff.']].map(([ic, t, b]) => { const Ic = iconOf(ic); return <li key={t} className="flex gap-4"><span className="size-10 shrink-0 rounded-lg bg-ng-indigo/20 text-ng-sky grid place-items-center"><Ic size={20} /></span><div><div className="font-semibold">{t}</div><div className="text-white/55 text-sm mt-0.5">{b}</div></div></li> })}
          </ul>
        </Reveal>
        <Reveal delay={120}>
          <div className="rounded-2xl border border-white/10 bg-ng-navy p-5 shadow-2xl">
            <div className="flex items-center justify-between"><div><div className="text-sm font-semibold">Bus 14 route change</div><div className="text-xs text-white/45">42 recipients · WhatsApp + SMS fallback</div></div><Badge tone="ok">Published</Badge></div>
            <div className="mt-4 divide-y divide-white/10">{rows.map(([n, s, c]) => <div key={n} className="flex justify-between py-2.5 text-sm"><span className="text-white/80">{n}</span><span className={cx('font-medium', tone[c])}>{s}</span></div>)}</div>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}

export function SecuritySection() {
  const s = [['Database', 'Tenant isolation', 'Row-level security on every tenant table. Cross-tenant access is blocked at the database.'], ['KeyRound', 'Server-side permissions', 'Roles are enforced on the server, never only in the interface.'], ['ScrollText', 'Audit trails', 'Sensitive actions and approvals are recorded in append-only logs.'], ['Lock', 'Secrets stay secret', 'Provider tokens and keys never reach the browser.'], ['FileCheck2', 'Consent & retention', 'Opt-in ledger per channel, retention rules and data export.'], ['Stethoscope', 'Stricter health data rules', 'Access reasons and mandatory logging for patient information.']]
  return (
    <Section eyebrow="Security" title="Designed for trust from the first record" sub="Security is part of the product architecture, not a settings page.">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {s.map(([ic, t, b], i) => { const Ic = iconOf(ic); return <Reveal key={t} delay={i * 60}><div className="h-full rounded-2xl border border-white/10 p-6 bg-gradient-to-b from-white/[0.05] to-transparent"><Ic className="text-ng-sky" /><h3 className="mt-4 font-semibold">{t}</h3><p className="mt-1.5 text-sm text-white/55 leading-relaxed">{b}</p></div></Reveal> })}
      </div>
    </Section>
  )
}

export function PricingSection({ compact }: { compact?: boolean }) {
  const [yearly, setYearly] = useState(true)
  return (
    <Section eyebrow="Pricing" title="Simple plans, priced by industry" sub="Sample pricing for design purposes only. Final commercial rates are not set.">
      <div className="flex items-center gap-3 mb-8">
        <div className="inline-flex rounded-full border border-white/15 p-1">
          {[false, true].map((y) => <button key={String(y)} onClick={() => setYearly(y)} className={cx('h-9 px-5 rounded-full text-sm font-medium transition cursor-pointer', yearly === y ? 'bg-ng-indigo text-ng-midnight' : 'text-white/60')}>{y ? 'Yearly' : 'Monthly'}</button>)}
        </div>
        {yearly && <Badge tone="ok">Save about 20%</Badge>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {planTiers.map((p, i) => (
          <Reveal key={p.key} delay={i * 70}>
            <div className={cx('relative h-full rounded-2xl p-6 border flex flex-col', p.featured ? 'border-ng-indigo bg-gradient-to-b from-ng-indigo/20 to-ng-navy shadow-ng-glow' : 'border-white/10 bg-white/[0.03]')}>
              {p.featured && <span className="absolute -top-3 left-6 rounded-full bg-ng-indigo px-3 py-0.5 text-xs font-semibold">Most chosen</span>}
              <h3 className="font-semibold">{p.name}</h3>
              <div className="mt-4 text-4xl font-bold tracking-tight">{p.key === 'ent' ? 'Custom' : p.key === 'trial' ? '₹0' : inr(yearly ? Math.round(p.y / 12) : p.m)}{p.key !== 'ent' && p.key !== 'trial' && <span className="text-sm font-normal text-white/50"> /mo</span>}</div>
              <p className="text-xs text-white/40 mt-1">{p.key === 'basic' || p.key === 'pro' ? (yearly ? `Billed ${inr(p.y)} yearly` : 'Billed monthly') : '\u00a0'} · sample</p>
              <p className="mt-4 text-sm text-white/60">{p.blurb}</p>
              <ul className="mt-5 space-y-2.5 text-sm flex-1">{p.limits.map((l) => <li key={l} className="flex gap-2.5"><I.Check size={16} className="text-ng-sky mt-0.5 shrink-0" />{l}</li>)}</ul>
              <Button className="mt-6" variant={p.featured ? 'primary' : 'outline-dark'} onClick={() => go(p.key === 'ent' ? '/contact' : '/register')}>{p.cta}</Button>
            </div>
          </Reveal>
        ))}
      </div>
      {!compact && <p className="mt-6 text-sm text-white/45">Add-ons: White-label from ₹1,999 / mo (sample) · Extra messages · Extra storage. Industry category determines available modules; plans never unlock another industry.</p>}
    </Section>
  )
}

export function FaqSection() {
  const [open, setOpen] = useState(0)
  return (
    <Section eyebrow="FAQ" title="Questions, answered">
      <div className="max-w-3xl divide-y divide-white/10 border-y border-white/10">
        {faqs.map(([q, a], i) => (
          <div key={q}>
            <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="w-full flex items-center justify-between gap-4 py-5 text-left font-medium cursor-pointer hover:text-ng-sky transition">{q}<I.Plus size={20} className={cx('shrink-0 transition-transform duration-300', open === i && 'rotate-45')} /></button>
            <div className={cx('grid transition-all duration-300', open === i ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]')}><p className="overflow-hidden text-white/60 leading-relaxed">{a}</p></div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function CtaBand() {
  return (
    <section className="mx-auto max-w-7xl px-5 pt-24">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 p-10 md:p-16 text-center bg-gradient-to-br from-ng-indigo/30 via-ng-navy to-ng-midnight">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="relative"><h2 className="text-3xl md:text-5xl font-bold tracking-tight">Run every operation on one grid.</h2><p className="mt-4 text-white/60">Start a 14-day free trial. No customer accounts required.</p><div className="mt-8 flex justify-center gap-3 flex-wrap"><Button size="lg" onClick={() => go('/register')}>Start free trial</Button><Button size="lg" variant="outline-dark" onClick={() => go('/contact')}>Talk to sales</Button></div></div>
      </div>
    </section>
  )
}

/* ---------- Standalone pages ---------- */
const PageIntro = ({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) => (
  <div className="relative overflow-hidden"><div className="absolute inset-0 grid-bg [mask-image:linear-gradient(#000,transparent)]" /><div className="relative mx-auto max-w-7xl px-5 pt-20 animate-rise"><Eyebrow>{eyebrow}</Eyebrow><h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl text-gradient leading-[1.05]">{title}</h1><p className="mt-5 text-lg text-white/60 max-w-2xl">{sub}</p></div></div>
)
export const ProductPage = () => <><PageIntro eyebrow="Product" title="One platform. Every operation." sub="A shared operational core with industry modules, private messaging and clear controls for owners and staff." /><ProductOverview /><FeatureGrid /><CtaBand /></>
export const IndustriesPage = () => <><PageIntro eyebrow="Industries" title="Your industry. Your workspace." sub="Each organisation is assigned one approved category and sees only the modules that belong to it." /><IndustryShowcase /><CtaBand /></>
export const FeaturesPage = () => <><PageIntro eyebrow="Features" title="Shared services that scale" sub="From contacts to communications, built once and reused across every industry." /><FeatureGrid /><CommunicationSection /><CtaBand /></>
export const SecurityPage = () => <><PageIntro eyebrow="Security" title="Isolation by design." sub="Tenant separation, server-side permissions and audit trails are part of the foundation." /><SecuritySection /><CtaBand /></>
export const PricingPage = () => <><PageIntro eyebrow="Pricing" title="Plans that grow with you." sub="Compare plans, then pick monthly or yearly billing." /><PricingSection /><FaqSection /></>

export function ContactPage() {
  const toast = useToast()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<Record<string, string>>({})
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const er: Record<string, string> = {}
    if (!String(f.get('name')).trim()) er.name = 'Please enter your name'
    if (!/^\S+@\S+\.\S+$/.test(String(f.get('email')))) er.email = 'Enter a valid email address'
    setErr(er)
    if (Object.keys(er).length) return
    setSending(true)
    setTimeout(() => { setSending(false); setSent(true); toast('Message sent. We reply within one business day.') }, 1100)
  }
  return (
    <>
      <PageIntro eyebrow="Contact" title="Talk to the NOVAGRID team" sub="Questions about your industry, migration or Enterprise needs? Send a note." />
      <div className="mx-auto max-w-7xl px-5 pt-14 grid lg:grid-cols-[1.2fr_1fr] gap-10">
        <div className="rounded-2xl bg-white text-ng-ink p-6 md:p-8">
          {sent ? (
            <div className="text-center py-10 animate-pop"><div className="mx-auto size-14 rounded-full bg-emerald-50 text-ng-ok grid place-items-center"><I.Check /></div><h2 className="mt-4 text-xl font-bold">Thanks, we have your message</h2><p className="text-ng-mute mt-1">This is a prototype, so nothing was actually sent.</p><Button className="mt-6" variant="secondary" onClick={() => setSent(false)}>Send another</Button></div>
          ) : (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
              <Field label="Full name" error={err.name}><Input name="name" invalid={!!err.name} placeholder="Your name" /></Field>
              <Field label="Work email" error={err.email}><Input name="email" invalid={!!err.email} placeholder="you@company.com" /></Field>
              <Field label="Industry"><Select name="ind">{industries.map((i) => <option key={i.key}>{i.name}</option>)}</Select></Field>
              <Field label="Organisation size"><Select><option>1–10 staff</option><option>11–50 staff</option><option>51–200 staff</option><option>200+ staff</option></Select></Field>
              <div className="sm:col-span-2"><Field label="How can we help?"><Textarea rows={5} placeholder="Tell us about your operation" /></Field></div>
              <div className="sm:col-span-2"><Button type="submit" size="lg" loading={sending}>Send message</Button></div>
            </form>
          )}
        </div>
        <div className="space-y-4">
          {[['Mail', 'Sales', 'sales@novagrid.example'], ['LifeBuoy', 'Support', 'support@novagrid.example'], ['MapPin', 'Studio', 'Placeholder address, India']].map(([ic, t, b]) => { const Ic = iconOf(ic); return <div key={t} className="flex gap-4 rounded-2xl border border-white/10 p-5"><Ic className="text-ng-sky" /><div><div className="font-semibold">{t}</div><div className="text-sm text-white/55">{b}</div></div></div> })}
        </div>
      </div>
    </>
  )
}

/* ---------- Login ---------- */
export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [role, setRole] = useState<'org' | 'platform'>('org')
  const auth = useAuth()
  const live = auth.backend === 'live'
  useEffect(() => {
    if (live && auth.session && auth.ready) go(auth.homePath())
  }, [live, auth.session, auth.ready, auth])
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    if (!String(f.get('pw'))) return setError('Enter your password to continue.')
    if (live) {
      setError('')
      setLoading(true)
      auth.signIn(String(f.get('em')).trim(), String(f.get('pw'))).catch((err: Error) => { setError(err.message); setLoading(false) })
      return
    }
    if (String(f.get('pw')) === 'wrong') return setError('Incorrect email or password. 2 attempts remaining.')
    setError(''); setLoading(true)
    setTimeout(() => go(role === 'platform' ? '/platform/overview' : '/app/education/overview'), 900)
  }
  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      <div className="hidden lg:flex relative overflow-hidden items-end p-14 border-r border-white/10">
        <div className="absolute inset-0 grid-bg" /><div className="absolute -bottom-40 -left-20 size-[560px] rounded-full bg-ng-indigo/30 blur-[120px]" />
        <div className="relative"><h2 className="text-4xl font-bold leading-tight text-gradient">Welcome back to your grid.</h2><p className="mt-4 text-white/60 max-w-md">Sign in to manage staff, people, payments and communications for your organisation.</p></div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm animate-rise" noValidate>
          <h1 className="text-2xl font-bold">Log in</h1><p className="text-sm text-white/55 mt-1">Customers and recipients do not need an account.</p>
          {!live && <div className="mt-6 grid grid-cols-2 rounded-lg bg-white/5 p-1 text-sm">{([['org', 'Organisation'], ['platform', 'Platform owner']] as const).map(([k, l]) => <button type="button" key={k} onClick={() => setRole(k)} className={cx('h-9 rounded-md font-medium cursor-pointer transition', role === k ? 'bg-white text-ng-ink' : 'text-white/60')}>{l}</button>)}</div>}
          {auth.backend === 'demo' && <p className="mt-4 rounded-lg bg-white/5 border border-white/10 p-3 text-xs text-white/60">Demo mode: {auth.backendNote || 'backend not connected'}. Sign-in uses sample data.</p>}
          <div className="mt-5 space-y-4 text-ng-ink [&_span]:text-white/80">
            <Field label="Email"><Input name="em" type="email" defaultValue={live ? '' : 'owner@example.com'} autoComplete="email" /></Field>
            <Field label="Password" error={error}><Input name="pw" type="password" placeholder={live ? 'Your password' : "Enter 'wrong' to preview the error state"} autoComplete="current-password" invalid={!!error} /></Field>
          </div>
          <Button type="submit" size="lg" className="w-full mt-6" loading={loading}>Continue</Button>
          <p className="text-sm text-white/55 mt-5 text-center">New organisation? <Link to="/register" className="text-ng-sky font-medium">Create an account</Link></p>
        </form>
      </div>
    </div>
  )
}

/* ---------- Registration flow ---------- */
export function RegisterPage() {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [err, setErr] = useState('')
  const auth = useAuth()
  const live = auth.backend === 'live'
  const [sent, setSent] = useState(false)
  const [f, setF] = useState({ password: '', org: '', owner: '', email: '', phone: '', address: '', country: 'India', state: '', city: '', industry: 'Schools & Colleges', type: '', plan: 'Professional' })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const steps = ['Organisation', 'Owner', 'Industry & plan', 'Verify', 'Review']
  const startLive = async () => {
    setBusy(true)
    try {
      const input = { name: f.org.trim(), ownerName: f.owner.trim(), phone: f.phone.replace(/[\s()-]/g, ''), address: f.address.trim(), country: f.country, state: f.state.trim(), city: f.city.trim(), categoryKey: industries.find((i) => i.name === f.industry)?.key ?? 'education', orgType: f.type, planKey: planTiers.find((p) => p.name === f.plan)?.key ?? 'trial' }
      const r = await auth.signUp(f.email.trim(), f.password, { token: crypto.randomUUID(), input })
      setSent(r.needsEmailConfirmation)
      setStep(3)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  }
  const next = () => {
    setErr('')
    if (step === 0) {
      if (f.org.trim().length < 2) return setErr('Enter an organisation name with at least 2 characters.')
      if (f.city.trim().length < 2) return setErr('Enter your organisation city.')
      if (f.state.trim().length < 2) return setErr('Enter your state.')
    }
    if (step === 1) {
      if (f.owner.trim().length < 2) return setErr('Owner full name is required.')
      if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr('Enter a valid work email address.')
      const normalizedPhone = f.phone.replace(/[\s()-]/g, '')
      if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) return setErr('Enter a valid phone number in international format, e.g. +919876543210.')
      if (live && f.password.length < 8) return setErr('Choose a password of at least 8 characters.')
    }
    if (step === 2) {
      if (!f.industry || !industries.some((i) => i.name === f.industry)) return setErr('Select a valid industry category.')
      if (!f.type.trim()) return setErr('Enter your organisation type.')
      if (!planTiers.some((p) => p.name === f.plan)) return setErr('Select a valid preferred plan.')
      if (live) return void startLive()
    }
    if (live && step === 3) return go('/login')
    if (!live && step === 3 && otp.join('').length !== 6) return setErr('Enter the 6-digit code we sent you.')
    if (!live && step === 3) { setBusy(true); return void setTimeout(() => { setBusy(false); setStep(4) }, 900) }
    setStep(step + 1)
  }
  const light = '[&_span]:!text-white/80'
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="text-3xl font-bold">Create your organisation</h1><p className="text-white/55 mt-1">Registration → verification → category approval → plan → activation.</p>
      <ol className="mt-8 flex gap-1.5">{steps.map((s, i) => <li key={s} className="flex-1"><div className={cx('h-1 rounded-full transition-all duration-500', i <= step ? 'bg-ng-indigo' : 'bg-white/15')} /><div className={cx('mt-2 text-[11px] sm:text-xs hidden sm:block', i === step ? 'text-white' : 'text-white/40')}>{s}</div></li>)}</ol>
      <div className="sm:hidden text-xs text-white/50 mt-2">Step {step + 1} of 5 · {steps[step]}</div>
      <div key={step} className={cx('mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 animate-rise text-ng-ink', light)}>
        {step === 0 && <div className="grid sm:grid-cols-2 gap-4"><div className="sm:col-span-2"><Field label="Organisation name"><Input value={f.org} onChange={set('org')} placeholder="e.g. St. Xavier Institute" /></Field></div><div className="sm:col-span-2"><Field label="Address"><Input value={f.address} onChange={set('address')} /></Field></div><Field label="Country"><Select value={f.country} onChange={set('country')}><option>India</option></Select></Field><Field label="State"><Input value={f.state} onChange={set('state')} /></Field><Field label="City"><Input value={f.city} onChange={set('city')} /></Field></div>}
        {step === 1 && <div className="grid gap-4"><Field label="Owner full name"><Input value={f.owner} onChange={set('owner')} /></Field><Field label="Work email"><Input type="email" value={f.email} onChange={set('email')} /></Field><Field label="Mobile number" hint={live ? 'International format, e.g. +919876543210. Phone verification needs an SMS provider and is not active yet.' : 'We send a verification code by SMS.'}><Input type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} placeholder="+919876543210" /></Field>{live && <Field label="Password" hint="At least 8 characters."><Input type="password" autoComplete="new-password" value={f.password} onChange={set('password')} /></Field>}</div>}
        {step === 2 && <div className="grid gap-4"><Field label="Industry category" hint="One primary category. Our team approves it before business modules unlock."><Select value={f.industry} onChange={set('industry')}>{industries.map((i) => <option key={i.key}>{i.name}</option>)}</Select></Field><Field label="Organisation type"><Input value={f.type} onChange={set('type')} placeholder="e.g. Private college" /></Field><Field label="Preferred plan"><Select value={f.plan} onChange={set('plan')}>{planTiers.map((p) => <option key={p.key}>{p.name}</option>)}</Select></Field><p className="text-xs text-white/50">Running a gym and a hotel? Register each as its own organisation.</p></div>}
        {step === 3 && live && <div className="text-center py-2"><div className="mx-auto size-14 rounded-full bg-ng-indigo/20 text-ng-sky grid place-items-center"><I.MailCheck /></div><h2 className="mt-4 text-xl font-bold">{sent ? 'Check your email' : 'Account created'}</h2><p className="text-sm text-white/60 mt-2 max-w-sm mx-auto">{sent ? <>We sent a confirmation link to <b>{f.email}</b>. Open it to verify your email. Your organisation is then created and sent for category approval.</> : 'Your email is already confirmed. Sign in to continue.'}</p></div>}
        {step === 3 && !live && <div><p className="text-sm text-white/70">Enter the code sent to <b>{f.email || 'your email'}</b> and <b>{f.phone || 'your phone'}</b>.</p><div className="mt-5 flex gap-2">{otp.map((d, i) => <input key={i} aria-label={`Digit ${i + 1}`} inputMode="numeric" maxLength={1} value={d} onChange={(e) => { const v = [...otp]; v[i] = e.target.value.replace(/\D/g, ''); setOtp(v); if (v[i]) (e.target.nextElementSibling as HTMLInputElement | null)?.focus() }} className="size-12 rounded-lg border border-white/20 bg-white text-center text-lg font-semibold text-ng-ink focus:ring-4 focus:ring-ng-indigo/30 outline-none" />)}</div><button className="mt-4 text-sm text-ng-sky cursor-pointer" onClick={() => setOtp('123456'.split(''))}>Fill demo code</button></div>}
        {step === 4 && (
          <div className="text-center py-4"><div className="mx-auto size-14 rounded-full bg-ng-indigo/20 text-ng-sky grid place-items-center animate-pulse-ring"><I.Hourglass /></div><h2 className="mt-4 text-xl font-bold">Awaiting category approval</h2><p className="text-white/60 mt-1 text-sm max-w-sm mx-auto">Business modules stay locked until the NOVAGRID team approves <b>{f.industry}</b> for {f.org || 'your organisation'}.</p>
            <ul className="mt-6 text-left max-w-xs mx-auto space-y-3 text-sm">{[['Registered', 1], ['Email & phone verified', 1], ['Category approval', 0], ['Plan & payment', -1], ['Dashboard activation', -1]].map(([l, s]) => <li key={l as string} className="flex items-center gap-3"><span className={cx('size-5 rounded-full grid place-items-center text-[10px]', s === 1 ? 'bg-ng-ok' : s === 0 ? 'bg-ng-indigo animate-pulse-ring' : 'bg-white/15')}>{s === 1 && <I.Check size={12} />}</span><span className={s === -1 ? 'text-white/40' : ''}>{l as string}</span></li>)}</ul>
            <div className="mt-7 flex gap-2 justify-center flex-wrap"><Button variant="outline-dark" onClick={() => go('/')}>Back to site</Button><Button onClick={() => go('/platform/approvals')}>See the approval side</Button></div>
          </div>
        )}
      </div>
      {err && <p className="mt-3 text-sm text-red-400 flex gap-2 items-center"><I.AlertCircle size={16} />{err}</p>}
      {step < 4 && <div className="mt-6 flex justify-between"><Button variant="outline-dark" disabled={step === 0} onClick={() => { setErr(''); setStep(step - 1) }}>Back</Button><Button loading={busy} onClick={next}>{live ? (step === 2 ? 'Create account' : step === 3 ? 'Go to login' : 'Continue') : step === 3 ? 'Verify & submit' : 'Continue'}</Button></div>}
    </div>
  )
}
