import { useEffect, useRef, useState } from 'react'
import { useScrollStore } from '../../store/useScrollStore'
import { PlanetHunt } from './PlanetHunt'

// A few small, dim planets drifting slowly far behind the site - distant muted spheres (soft CSS
// radial-gradient bodies lit from the upper-left with a faint glow, near-monochrome plus one faint
// accent-tinted world) that deepen the space backdrop alongside the starfield. Fixed full-viewport
// at z-[4] (behind the stars, in front of the canvas). Each drifts on a slow circular path around its
// resting spot (tens of seconds per orbit) - gentle but perceptible; disabled under reduced motion
// (see index.css). Hand-placed (not seeded) so the composition stays intentional: small, toward the
// edges/corners, and clear of the orb + hero name + nav.
//
// The planets sit behind the content (z-[4]), so they can't catch pointer events directly. Instead a
// pair of window listeners hit-tests each planet's on-screen circle (independent of z-order):
//   - hover  -> a small, faint click icon floats just above the planet + a gentle brighten + a pointer
//               cursor, so it quietly reads as interactive without shouting.
//   - click  -> the planet brightens for a beat (.is-lit), then eases back.
//
// Easter egg: light all THREE at once and a controllable saucer (PlanetHunt) spawns - fly it (mouse or
// arrow keys) and blow up every planet. Desktop only (needs a cursor/keys).

type Planet = {
  top: number
  left: number
  size: number
  palette: 'slate' | 'cool' | 'accent'
  orbit: number // radius (px) of the slow circular drift around its resting spot
  duration: number // seconds per full orbit
  delay: number // negative offset so they're desynced / start at different angles
}

const PLANETS: Planet[] = [
  { top: 18, left: 83, size: 18, palette: 'accent', orbit: 52, duration: 30, delay: -7 },
  { top: 57, left: 6, size: 12, palette: 'slate', orbit: 44, duration: 45, delay: -20 },
  { top: 79, left: 72, size: 24, palette: 'cool', orbit: 60, duration: 37, delay: -12 },
]

const LIT_MS = 2600 // how long a clicked planet stays brightened before easing back
const HIT_PAD = 14 // extra px around the (small) planet so it's forgiving to hover/click

type Hit = { index: number; cx: number; cy: number; top: number }

export function Planets() {
  const refs = useRef<(HTMLSpanElement | null)[]>([])
  const cueRef = useRef<HTMLDivElement | null>(null)
  const hoveredRef = useRef<number | null>(null)
  const timers = useRef<number[]>([])
  const [lit, setLit] = useState<boolean[]>(() => PLANETS.map(() => false))
  const [hovered, setHovered] = useState<number | null>(null)
  const [dead, setDead] = useState<boolean[]>(() => PLANETS.map(() => false))
  const [gameOn, setGameOn] = useState(false)
  const gameOnRef = useRef(false)
  const lowPower = useScrollStore((state) => state.lowPower)
  const reducedMotion = useScrollStore((state) => state.reducedMotion)

  // Keep a ref the window listeners can read so they go quiet while the hunt is running.
  useEffect(() => {
    gameOnRef.current = gameOn
  }, [gameOn])

  // Trigger: all three lit at once -> launch the hunt. Desktop only (cursor / keys); reset the lights
  // so it doesn't immediately re-fire when the game ends.
  useEffect(() => {
    if (gameOn || lowPower || reducedMotion || !lit.every(Boolean)) return
    timers.current.forEach((timer) => window.clearTimeout(timer))
    setLit(PLANETS.map(() => false))
    setDead(PLANETS.map(() => false))
    setHovered(null)
    document.body.style.cursor = ''
    setGameOn(true)
  }, [lit, gameOn, lowPower, reducedMotion])

  useEffect(() => {
    const planetAt = (x: number, y: number): Hit | null => {
      let found: Hit | null = null
      refs.current.forEach((el, index) => {
        if (!el) return
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        if (Math.hypot(x - cx, y - cy) <= Math.max(rect.width, rect.height) / 2 + HIT_PAD) {
          found = { index, cx, cy, top: rect.top }
        }
      })
      return found
    }

    // Don't react to pointers that are really aimed at a control (nav links, email, socials).
    const isControl = (target: EventTarget | null) =>
      !!(target as HTMLElement | null)?.closest('a, button, input, textarea, select, label')

    const onPointerMove = (event: PointerEvent) => {
      if (gameOnRef.current || event.pointerType === 'touch') return // hover cue off during the hunt
      const hit = isControl(event.target) ? null : planetAt(event.clientX, event.clientY)
      if (hit && cueRef.current) {
        // float the cue just above the planet, horizontally centred on it
        cueRef.current.style.transform = `translate(${hit.cx}px, ${hit.top - 12}px) translate(-50%, -100%)`
      }
      const index = hit ? hit.index : null
      if (index !== hoveredRef.current) {
        hoveredRef.current = index
        setHovered(index)
        document.body.style.cursor = index !== null ? 'pointer' : ''
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (gameOnRef.current || isControl(event.target)) return
      const hit = planetAt(event.clientX, event.clientY)
      if (!hit) return
      const { index } = hit
      setLit((prev) => prev.map((value, i) => (i === index ? true : value)))
      window.clearTimeout(timers.current[index])
      timers.current[index] = window.setTimeout(() => {
        setLit((prev) => prev.map((value, i) => (i === index ? false : value)))
      }, LIT_MS)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown)
    const pending = timers.current
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      document.body.style.cursor = ''
      pending.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  return (
    <>
      {/* Raised above the dim backdrop (z-60) while the hunt is on, so the planets read as targets. */}
      <div aria-hidden className={`pointer-events-none fixed inset-0 ${gameOn ? 'z-[61]' : 'z-[4]'}`}>
        {PLANETS.map((planet, index) => {
          const style: Record<string, string | number> = {
            top: `${planet.top}%`,
            left: `${planet.left}%`,
            width: `${planet.size}px`,
            height: `${planet.size}px`,
            '--orbit': `${planet.orbit}px`,
            '--dur': `${planet.duration}s`,
            animationDelay: `${planet.delay}s`,
          }
          const state = gameOn
            ? ` is-target${dead[index] ? ' is-dead' : ''}`
            : `${lit[index] ? ' is-lit' : ''}${hovered === index ? ' is-hover' : ''}`
          return (
            <span
              key={index}
              ref={(el) => {
                refs.current[index] = el
              }}
              className={`planet planet-${planet.palette}${state}`}
              style={style as React.CSSProperties}
            />
          )
        })}
      </div>

      {/* Hover cue: a small, faint click glyph that floats above whichever background planet the cursor
          is over - a quiet hint that the distant worlds are interactive. Positioned by the listener. */}
      <div ref={cueRef} aria-hidden className={`planet-cue${hovered !== null ? ' is-on' : ''}`}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 3l14 8-6 1.5-3 5.5z" />
        </svg>
      </div>

      {gameOn && (
        <PlanetHunt
          planetEls={refs.current}
          onKill={(index) => setDead((prev) => prev.map((value, i) => (i === index ? true : value)))}
          onEnd={() => {
            setGameOn(false)
            setDead(PLANETS.map(() => false))
            setLit(PLANETS.map(() => false))
          }}
        />
      )}
    </>
  )
}
