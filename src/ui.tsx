import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { AlertTriangle, Check, ChevronDown, Inbox, Info, RefreshCw, Search, X } from 'lucide-react'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

/* ---------- Logo ---------- */
export function LogoMark({ size = 32 }: { size?: number }) {
  const id = 'lg' + size
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#d9f74f" />
          <stop offset="1" stopColor="#b7dc10" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => {
          const lit = (r === 1 && c === 1) || (r === 0 && c === 2) || (r === 2 && c === 0)
          return (
            <rect key={r + '' + c} x={6.5 + c * 7.2} y={6.5 + r * 7.2} width="5" height="5" rx="1.6" fill="#08090b" opacity={lit ? 1 : 0.3} />
          )
        }),
      )}
      <circle cx="23.7" cy="8.7" r="1.2" fill="#fff" />
    </svg>
  )
}
export function Logo({ dark = false, size = 30, compact = false }: { dark?: boolean; size?: number; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {!compact && (
        <span className={cx('text-[17px] font-extrabold tracking-[0.14em]', dark ? 'text-white' : 'text-ng-ink')}>
          NOVA<span className="text-ng-indigo-d">GRID</span>
        </span>
      )}
    </span>
  )
}

/* ---------- Button ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'outline-dark'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}
export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...p }: BtnProps) {
  const v = {
    primary: 'bg-ng-indigo text-ng-midnight hover:bg-ng-sky shadow-ng-sm hover:shadow-ng-glow',
    secondary: 'bg-white text-ng-ink border border-ng-line hover:border-ng-ink/40 hover:bg-ng-canvas',
    ghost: 'text-ng-mute hover:bg-ng-tint hover:text-ng-indigo-d',
    danger: 'bg-ng-err text-white hover:bg-red-600',
    dark: 'bg-white text-ng-midnight hover:bg-ng-tint',
    'outline-dark': 'border border-white/20 text-white hover:bg-white/10',
  }[variant]
  const s = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-[15px]' }[size]
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        v,
        s,
        className,
      )}
    >
      {loading ? <RefreshCw size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

/* ---------- Badge ---------- */
export type Tone = 'ok' | 'warn' | 'err' | 'info' | 'brand' | 'neutral' | 'violet'
const tones: Record<Tone, string> = {
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  warn: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  err: 'bg-red-50 text-red-700 ring-red-600/15',
  info: 'bg-stone-100 text-stone-700 ring-stone-500/20',
  brand: 'bg-ng-tint text-ng-indigo-d ring-ng-indigo/20',
  violet: 'bg-lime-100 text-lime-900 ring-lime-700/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/10',
}
export function Badge({ tone = 'neutral', children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap', tones[tone])}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
const statusTone: Record<string, Tone> = {
  Active: 'ok', Approved: 'ok', Paid: 'ok', Delivered: 'ok', Read: 'violet', Sent: 'info', Queued: 'neutral', Submitted: 'info',
  Pending: 'warn', 'In review': 'warn', Trial: 'brand', Grace: 'warn', Retrying: 'warn', Scheduled: 'info', Due: 'warn',
  Suspended: 'err', Failed: 'err', Rejected: 'err', Overdue: 'err', Expired: 'err', Draft: 'neutral', Verified: 'ok', 'Opted in': 'ok', 'Opted out': 'err', Present: 'ok', Absent: 'err', Late: 'warn',
}
export const Status = ({ value }: { value: string }) => <Badge tone={statusTone[value] ?? 'neutral'}>{value}</Badge>

/* ---------- Card ---------- */
export function Card({ className, children, hover, ...p }: { className?: string; children: ReactNode; hover?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...p}
      className={cx(
        'bg-white rounded-2xl border border-ng-line shadow-ng-sm',
        hover && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-ng-md hover:border-ng-indigo/30',
        className,
      )}
    >
      {children}
    </div>
  )
}
export function CardHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div>
        <h3 className="text-[15px] font-semibold text-ng-ink">{title}</h3>
        {sub && <p className="text-[13px] text-ng-mute mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

/* ---------- Form ---------- */
const fieldBase =
  'w-full rounded-lg border border-ng-line bg-white px-3 text-sm text-ng-ink placeholder:text-slate-400 transition focus:border-ng-ink focus:ring-4 focus:ring-ng-indigo/50 outline-none'
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ng-ink mb-1.5">{label}</span>
      {children}
      {error ? <span className="block text-xs text-ng-err mt-1">{error}</span> : hint && <span className="block text-xs text-ng-mute mt-1">{hint}</span>}
    </label>
  )
}
export function Input({ className, invalid, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...p} className={cx(fieldBase, 'h-10', invalid && 'border-ng-err focus:border-ng-err focus:ring-ng-err/15', className)} />
}
export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cx(fieldBase, 'h-10 pr-8 cursor-pointer', className)}>
      {children}
    </select>
  )
}
export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(fieldBase, 'py-2.5 resize-none', className)} />
}
export function SearchBox({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ng-mute" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={placeholder} />
    </div>
  )
}
export function Toggle({ on, onChange, label, disabled = false }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed', on ? 'bg-ng-indigo' : 'bg-slate-300')}>
      <span className={cx('absolute top-0.5 left-0.5 size-5 rounded-full shadow transition-transform', on ? 'translate-x-5 bg-ng-midnight' : 'bg-white')} />
    </button>
  )
}
export function Chips<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={cx('h-8 px-3 rounded-full text-[13px] font-medium border transition cursor-pointer', value === o ? 'bg-ng-indigo text-ng-midnight border-ng-indigo' : 'bg-white text-ng-mute border-ng-line hover:border-ng-indigo/50')}>
          {o}
        </button>
      ))}
    </div>
  )
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string; count?: number }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-ng-line overflow-x-auto scrollbar-none">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={cx('relative px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition cursor-pointer', value === t.id ? 'text-ng-ink' : 'text-ng-mute hover:text-ng-ink')}>
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 rounded-full bg-ng-tint px-1.5 py-0.5 text-[11px] text-ng-indigo-d">{t.count}</span>}
          <span className={cx('absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-ng-midnight transition-transform origin-left', value === t.id ? 'scale-x-100' : 'scale-x-0')} />
        </button>
      ))}
    </div>
  )
}

/* ---------- Modal / Confirm / Dropdown / Toast ---------- */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal aria-label={title}>
      <div className="absolute inset-0 bg-ng-midnight/50 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className={cx('relative w-full bg-white rounded-t-2xl sm:rounded-2xl shadow-ng-lg animate-sheet sm:animate-pop max-h-[90vh] flex flex-col', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ng-line">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="size-8 grid place-items-center rounded-lg text-ng-mute hover:bg-ng-canvas cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-4 border-t border-ng-line bg-ng-canvas/60 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  )
}
export function Confirm({ open, onClose, onConfirm, title, body, confirmLabel = 'Confirm', danger }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel?: string; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button></>}>
      <div className="flex gap-3">
        <div className={cx('size-10 shrink-0 rounded-full grid place-items-center', danger ? 'bg-red-50 text-ng-err' : 'bg-ng-midnight text-ng-lime')}><AlertTriangle size={20} /></div>
        <div className="text-sm text-ng-mute leading-relaxed">{body}</div>
      </div>
    </Modal>
  )
}
export type MenuItem = { label: string; icon?: ReactNode; onClick?: () => void; danger?: boolean; divider?: boolean }
export function Dropdown({ trigger, items, align = 'right', label }: { trigger: ReactNode; items: MenuItem[]; align?: 'left' | 'right'; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const c = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', c)
    document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', c); document.removeEventListener('keydown', k) }
  }, [open])
  return (
    <div ref={ref} className="relative inline-block">
      <button aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} className="cursor-pointer">{trigger}</button>
      {open && (
        <div role="menu" className={cx('absolute z-50 mt-2 min-w-48 rounded-xl border border-ng-line bg-white p-1.5 shadow-ng-lg animate-drop', align === 'right' ? 'right-0' : 'left-0')}>
          {items.map((it, i) =>
            it.divider ? <div key={i} className="my-1 h-px bg-ng-line" /> : (
              <button key={i} role="menuitem" onClick={() => { it.onClick?.(); setOpen(false) }} className={cx('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm cursor-pointer', it.danger ? 'text-ng-err hover:bg-red-50' : 'text-ng-ink hover:bg-ng-tint')}>
                {it.icon}{it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
type ToastItem = { id: number; msg: string; tone: 'ok' | 'err' | 'info' }
const ToastCtx = createContext<(msg: string, tone?: ToastItem['tone']) => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((msg: string, tone: ToastItem['tone'] = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x, { id, msg, tone }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed z-[90] bottom-20 md:bottom-6 right-4 left-4 sm:left-auto flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-3 rounded-xl bg-ng-midnight text-white pl-3 pr-4 py-3 text-sm shadow-ng-lg animate-pop max-w-sm">
            <span className={cx('size-6 rounded-full grid place-items-center', t.tone === 'ok' ? 'bg-ng-ok' : t.tone === 'err' ? 'bg-ng-err' : 'bg-ng-indigo')}>
              {t.tone === 'ok' ? <Check size={14} /> : t.tone === 'err' ? <X size={14} /> : <Info size={14} />}
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------- States ---------- */
export function useFakeLoad(ms = 700, deps: unknown[] = []) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), ms)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return loading
}
export const Skel = ({ className }: { className?: string }) => <div className={cx('skeleton rounded-lg', className)} />
export function EmptyState({ title, body, action, icon }: { title: string; body: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6 animate-fade">
      <div className="size-14 rounded-2xl bg-ng-midnight text-ng-lime grid place-items-center mb-4">{icon ?? <Inbox size={26} />}</div>
      <h3 className="font-semibold text-ng-ink">{title}</h3>
      <p className="text-sm text-ng-mute mt-1 max-w-sm">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
export function ErrorState({ title = 'Something went wrong', onRetry, body = 'We could not load this data. Check your connection and try again.', action }: { title?: string; onRetry?: () => void; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <div className="size-14 rounded-2xl bg-red-50 text-ng-err grid place-items-center mb-4"><AlertTriangle size={26} /></div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-ng-mute mt-1 max-w-sm">{body}</p>
      {action ? <div className="mt-5">{action}</div> : onRetry && <Button variant="secondary" className="mt-5" icon={<RefreshCw size={15} />} onClick={onRetry}>Try again</Button>}
    </div>
  )
}

/* ---------- Data table (cards on mobile) ---------- */
export type Col<T> = { key: string; header: string; render?: (r: T) => ReactNode; mobile?: 'title' | 'hide' | 'show'; className?: string }
export function DataTable<T extends { id: string | number }>({ cols, rows, onRow, loading, empty }: { cols: Col<T>[]; rows: T[]; onRow?: (r: T) => void; loading?: boolean; empty?: ReactNode }) {
  const cell = (c: Col<T>, r: T) => (c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? ''))
  if (loading) return <div className="p-5 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skel key={i} className="h-11" />)}</div>
  if (!rows.length) return <>{empty ?? <EmptyState title="No results" body="Try adjusting your search or filters." />}</>
  const title = cols.find((c) => c.mobile === 'title') ?? cols[0]
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ng-line text-left text-[12px] uppercase tracking-wide text-ng-mute">
              {cols.map((c) => <th key={c.key} className={cx('px-5 py-3 font-semibold whitespace-nowrap', c.className)}>{c.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} onClick={() => onRow?.(r)} style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }} className={cx('border-b border-ng-line/70 last:border-0 animate-rise hover:bg-ng-canvas/80 transition-colors', onRow && 'cursor-pointer')}>
                {cols.map((c) => <td key={c.key} className={cx('px-5 py-3.5 align-middle', c.className)}>{cell(c, r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden divide-y divide-ng-line">
        {rows.map((r) => (
          <div key={r.id} onClick={() => onRow?.(r)} className="p-4 space-y-2 active:bg-ng-canvas">
            <div className="font-semibold">{cell(title, r)}</div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
              {cols.filter((c) => c !== title && c.mobile !== 'hide').slice(0, 5).map((c) => (
                <div key={c.key}><dt className="text-ng-mute text-[11px] uppercase tracking-wide">{c.header}</dt><dd className="mt-0.5">{cell(c, r)}</dd></div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------- Page header & stat ---------- */
export function PageHeader({ title, sub, actions, back }: { title: string; sub?: string; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 animate-rise">
      <div>
        {back}
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-ng-mute mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
export function Stat({ label, value, delta, icon, i = 0 }: { label: string; value: string; delta?: string; icon: ReactNode; i?: number }) {
  const up = !delta?.startsWith('-')
  return (
    <Card hover className="p-5 animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ng-mute">{label}</span>
        <span className="size-9 rounded-lg bg-ng-midnight text-ng-lime grid place-items-center">{icon}</span>
      </div>
      <div className="mt-3 text-[28px] font-bold tracking-tight leading-none">{value}</div>
      {delta && <div className={cx('mt-2 text-xs font-semibold', up ? 'text-ng-ok' : 'text-ng-err')}>{delta} <span className="font-normal text-ng-mute">vs last month</span></div>}
    </Card>
  )
}
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 3
  const bg = ['bg-ng-midnight text-ng-lime', 'bg-ng-indigo text-ng-midnight', 'bg-stone-200 text-ng-ink'][hue]
  return <span style={{ width: size, height: size, fontSize: size * 0.38 }} className={cx('inline-grid place-items-center rounded-full font-semibold shrink-0', bg)}>{initials}</span>
}
export const ChevronIcon = ChevronDown

/* ---------- Scroll reveal ---------- */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ animationDelay: `${delay}ms` }} className={cx(seen ? 'animate-rise' : 'opacity-0', className)}>
      {children}
    </div>
  )
}

/* ---------- Charts (SVG, animated) ---------- */
export function AreaChart({ data, labels, color = '#08090b', height = 220, format = (n: number) => String(n) }: { data: number[]; labels: string[]; color?: string; height?: number; format?: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 600, H = 220, P = 10
  const max = Math.max(...data) * 1.1, min = 0
  const pts = data.map((v, i) => [P + (i * (W - P * 2)) / (data.length - 1), H - 24 - ((v - min) / (max - min)) * (H - 44)] as const)
  const line = pts.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x},${y}`
    const [px, py] = pts[i - 1]
    const cx1 = (px + x) / 2
    return d + ` C${cx1},${py} ${cx1},${y} ${x},${y}`
  }, '')
  const area = `${line} L${pts[pts.length - 1][0]},${H - 24} L${pts[0][0]},${H - 24} Z`
  const gid = 'g' + color.slice(1)
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ height }} className="w-full" preserveAspectRatio="none" onMouseLeave={() => setHover(null)} onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        setHover(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - r.left) / r.width) * (data.length - 1)))))
      }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cdf22b" stopOpacity=".7" /><stop offset="1" stopColor="#cdf22b" stopOpacity="0" /></linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => <line key={i} x1="0" x2={W} y1={20 + i * 50} y2={20 + i * 50} stroke="#E6E8F0" strokeDasharray="3 4" />)}
        <path d={area} fill={`url(#${gid})`} className="animate-fade" style={{ animationDelay: '.5s' }} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" pathLength={1} strokeDasharray={1} style={{ animation: 'draw 1.2s cubic-bezier(.3,.7,.2,1) both' }} vectorEffect="non-scaling-stroke" />
        {hover !== null && <><line x1={pts[hover][0]} x2={pts[hover][0]} y1="10" y2={H - 24} stroke={color} strokeOpacity=".3" /><circle cx={pts[hover][0]} cy={pts[hover][1]} r="5" fill="#cdf22b" stroke={color} strokeWidth="2.5" /></>}
      </svg>
      {hover !== null && (
        <div className="absolute top-0 -translate-x-1/2 rounded-lg bg-ng-midnight px-2.5 py-1.5 text-xs text-white shadow-ng-md pointer-events-none whitespace-nowrap" style={{ left: `${(pts[hover][0] / W) * 100}%` }}>
          <b>{format(data[hover])}</b> <span className="text-white/60">{labels[hover]}</span>
        </div>
      )}
      <div className="flex justify-between text-[11px] text-ng-mute px-1 -mt-5">{labels.filter((_, i) => i % Math.ceil(labels.length / 6) === 0).map((l) => <span key={l}>{l}</span>)}</div>
    </div>
  )
}
export function BarChart({ data, labels, height = 180, color = '#08090b', format = (n: number) => String(n) }: { data: number[]; labels: string[]; height?: number; color?: string; format?: (n: number) => string }) {
  const max = Math.max(...data)
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((v, i) => (
          <div key={i} className="group relative flex-1 h-full flex items-end">
            <div className="w-full rounded-t-md origin-bottom animate-grow transition-colors group-hover:!bg-ng-indigo group-hover:![background-image:none]" style={{ height: `${(v / max) * 100}%`, background: `linear-gradient(${color}, ${color}99)`, animationDelay: `${i * 50}ms` }} />
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-ng-midnight px-1.5 py-0.5 text-[11px] text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap">{format(v)}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">{labels.map((l, i) => <span key={i} className="flex-1 text-center text-[11px] text-ng-mute">{l}</span>)}</div>
    </div>
  )
}
export function Donut({ parts, center }: { parts: { label: string; value: number; color: string }[]; center?: ReactNode }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t) }, [])
  const total = parts.reduce((a, p) => a + p.value, 0)
  const R = 52, C = 2 * Math.PI * R
  let acc = 0
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r={R} fill="none" stroke="#EEF0F7" strokeWidth="16" />
          {parts.map((p) => {
            const len = (p.value / total) * C
            const el = <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${on ? Math.max(len - 2, 0) : 0} ${C}`} strokeDashoffset={-acc} style={{ transition: 'stroke-dasharray 1s cubic-bezier(.3,.7,.2,1)' }} />
            acc += len
            return el
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
      </div>
      <ul className="space-y-2 text-sm w-full">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2.5"><span className="size-2.5 rounded-sm" style={{ background: p.color }} /><span className="flex-1 text-ng-mute">{p.label}</span><b>{p.value}</b></li>
        ))}
      </ul>
    </div>
  )
}
export function Meter({ label, used, total, unit = '' }: { label: string; used: number; total: number; unit?: string }) {
  const pct = Math.min(100, (used / total) * 100)
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5"><span className="font-medium">{label}</span><span className="text-ng-mute">{used.toLocaleString('en-IN')} / {total.toLocaleString('en-IN')}{unit}</span></div>
      <div className="h-2 rounded-full bg-ng-tint overflow-hidden"><div className={cx('h-full rounded-full origin-left animate-grow', pct > 85 ? 'bg-ng-warn' : 'bg-ng-midnight')} style={{ width: `${pct}%`, animationName: 'rise' }} /></div>
    </div>
  )
}
