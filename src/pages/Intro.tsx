import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '../ui'

const WORD = 'NOVAGRID'
export const INTRO_KEY = 'ng_intro_seen'

/** Timeline: grid awakens, type, wax melt, particles, reveal. Total about 7s. */
export function Intro({ onDone }: { onDone: () => void }) {
  const [typed, setTyped] = useState(0)
  const [phase, setPhase] = useState<'grid' | 'type' | 'melt' | 'glow' | 'reveal'>('grid')
  const canvas = useRef<HTMLCanvasElement>(null)
  const cells = useRef(Array.from({ length: 12 * 8 }, (_, i) => ({ on: Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1 > 0.62, d: (Math.abs(Math.sin(i * 4.1)) * 1.8).toFixed(2) })))

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onDone()
    const t = [
      setTimeout(() => setPhase('type'), 1500),
      setTimeout(() => setPhase('melt'), 3600),
      setTimeout(() => setPhase('glow'), 5000),
      setTimeout(() => setPhase('reveal'), 6400),
      setTimeout(onDone, 7300),
    ]
    return () => t.forEach(clearTimeout)
  }, [onDone])

  useEffect(() => {
    if (phase !== 'type') return
    const id = setInterval(() => setTyped((n) => Math.min(n + 1, WORD.length)), 130)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'glow') return
    const c = canvas.current!
    const ctx = c.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    c.width = innerWidth * dpr
    c.height = innerHeight * dpr
    ctx.scale(dpr, dpr)
    const colors = ['205,242,43', '168,204,18', '230,255,122']
    const ps = Array.from({ length: 160 }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * Math.min(520, innerWidth * 0.8), y: innerHeight / 2 + 40, vx: (Math.random() - 0.5) * 1.2, vy: -(0.6 + Math.random() * 2.2), r: 1 + Math.random() * 3, life: 1, c: colors[Math.floor(Math.random() * 3)] }))
    let raf = 0
    const loop = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      ctx.globalCompositeOperation = 'lighter'
      ps.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy *= 0.995
        p.life -= 0.009
        if (p.life <= 0) return
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6)
        g.addColorStop(0, `rgba(${p.c},${p.life})`)
        g.addColorStop(1, `rgba(${p.c},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 6, 0, 7)
        ctx.fill()
      })
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const melting = phase === 'melt' || phase === 'glow' || phase === 'reveal'
  return (
    <div role="dialog" aria-label="NOVAGRID intro" className="fixed inset-0 z-[100] bg-ng-midnight overflow-hidden transition-all duration-[900ms] ease-out" style={phase === 'reveal' ? { opacity: 0, transform: 'scale(1.06)', filter: 'blur(6px)', pointerEvents: 'none' } : undefined}>
      <svg width="0" height="0" className="absolute"><defs><filter id="wax"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" /><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" /></filter></defs></svg>
      <div className="absolute inset-0 grid-bg opacity-0 [animation:fade_1.6s_ease_forwards] [transform:perspective(900px)_rotateX(18deg)_scale(1.3)]" />
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 [mask-image:radial-gradient(circle,#000_30%,transparent_80%)]">
        {cells.current.map((c, i) => <div key={i}>{c.on && <div className="m-[3px] h-[calc(100%-6px)] rounded-sm bg-ng-indigo/60 shadow-[0_0_24px_rgba(205,242,43,.7)] opacity-5" style={{ animation: `cell-awake 2.2s ease-in-out ${c.d}s infinite` }} />}</div>)}
      </div>
      <div className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ng-indigo/20 blur-[120px]" />

      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className={'mx-auto mb-6 w-fit transition-all duration-700 ' + (phase === 'grid' ? 'opacity-0 scale-75' : 'opacity-100 scale-100')} style={melting ? { animation: 'melt 1.2s ease-in 0.5s forwards', transformOrigin: 'bottom' } : undefined}><LogoMark size={64} /></div>
          <div className="relative" style={melting ? { filter: 'url(#wax)' } : undefined}>
            <div className="flex justify-center text-[11vw] sm:text-[88px] font-extrabold tracking-[0.14em] leading-none text-white pl-[0.14em]" style={melting ? { animation: 'melt 1.5s cubic-bezier(.5,0,.9,.4) 0.4s forwards', transformOrigin: 'bottom' } : undefined}>
              {WORD.split('').map((l, i) => <span key={i} className="relative inline-block transition-all duration-300" style={{ opacity: i < typed ? 1 : 0, transform: i < typed ? 'none' : 'translateY(10px)' }}>{l}</span>)}
              {phase === 'type' && typed < WORD.length && <span className="inline-block w-[3px] h-[0.9em] bg-ng-sky ml-2 self-center [animation:blink_.7s_steps(1)_infinite]" />}
            </div>
            {melting && (
              <div className="absolute inset-x-0 top-[78%] flex justify-center pl-[0.14em]" aria-hidden>
                {WORD.split('').map((_, i) => {
                  const len = 70 + ((i * 53) % 90)
                  return (
                    <span key={i} className="relative inline-block w-[9.4vw] sm:w-[88px] mr-[1.5vw] sm:mr-[12.3px]">
                      <span className="absolute left-1/2 -translate-x-1/2 top-0 w-3 sm:w-4 rounded-b-full bg-white" style={{ ['--len' as string]: len + 'px', animation: `drip 1.3s ease-in ${0.3 + i * 0.09}s both` }} />
                      <span className="absolute left-1/2 -translate-x-1/2 top-[40px] size-3 sm:size-4 rounded-full bg-white opacity-0" style={{ animation: `fall 1.1s ease-in ${1 + i * 0.08}s both` }} />
                    </span>
                  )
                })}
              </div>
            )}
          </div>
          <p className={'mt-6 text-sm tracking-[0.3em] uppercase text-white/50 transition-opacity duration-700 ' + (typed >= WORD.length && phase === 'type' ? 'opacity-100' : 'opacity-0')}>Every Operation. One Intelligent Grid.</p>
        </div>
      </div>
      <canvas ref={canvas} className="absolute inset-0 w-full h-full pointer-events-none" />
      <button onClick={onDone} className="absolute bottom-6 right-6 text-xs text-white/50 hover:text-white border border-white/15 rounded-full px-4 py-2 cursor-pointer transition">Skip intro</button>
    </div>
  )
}
