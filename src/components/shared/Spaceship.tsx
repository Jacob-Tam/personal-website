import { useEffect, useRef, useState } from 'react'
import { useScrollStore } from '../../store/useScrollStore'

/*
  Easter egg: a tiny alien saucer (~3/4 the size of a planet) that occasionally drifts across the
  background - same z-band as the planets (z-[4]) but moving much faster, a quick fly-by rather than
  a slow orbit. 10% chance every 10s, never overlaps itself, and off under reduced motion. It enters
  off one edge, crosses with a slight vertical drift, and despawns on animation end.
*/
const CHANCE = 0.1
const INTERVAL_MS = 10000

type Flight = {
  id: number
  ltr: boolean // travelling left-to-right?
  top: number // vertical band (%)
  duration: number // seconds to cross
  driftY: number // slight vertical drift over the crossing (vh)
}

function Saucer({ flip }: { flip: boolean }) {
  return (
    <svg
      width="18"
      height="10"
      viewBox="0 0 44 24"
      style={{
        transform: flip ? 'scaleX(-1)' : undefined,
        filter: 'drop-shadow(0 0 3px rgba(96, 170, 220, 0.4))',
      }}
    >
      <ellipse cx="22" cy="17" rx="20" ry="3" fill="rgba(96, 170, 220, 0.22)" />
      <ellipse cx="22" cy="14" rx="20" ry="5" fill="#3f4a55" />
      <ellipse cx="22" cy="13" rx="20" ry="4" fill="#6b7886" />
      <path d="M10 13 a12 9 0 0 1 24 0 z" fill="rgba(150, 200, 235, 0.5)" />
      <circle cx="14" cy="14.5" r="1" fill="#d4ecff" />
      <circle cx="22" cy="15" r="1" fill="#d4ecff" />
      <circle cx="30" cy="14.5" r="1" fill="#d4ecff" />
    </svg>
  )
}

export function Spaceship() {
  const reducedMotion = useScrollStore((state) => state.reducedMotion)
  const [flight, setFlight] = useState<Flight | null>(null)
  const activeRef = useRef(false)
  const idRef = useRef(0)

  useEffect(() => {
    if (reducedMotion) return
    const interval = window.setInterval(() => {
      if (activeRef.current || Math.random() > CHANCE) return
      activeRef.current = true
      idRef.current += 1
      setFlight({
        id: idRef.current,
        ltr: Math.random() < 0.5,
        top: 8 + Math.random() * 38,
        duration: 6 + Math.random() * 3,
        driftY: (Math.random() * 2 - 1) * 5,
      })
    }, INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [reducedMotion])

  if (!flight) return null

  const style: Record<string, string | number> = {
    top: `${flight.top}%`,
    '--dur': `${flight.duration}s`,
    '--from-x': flight.ltr ? '-15vw' : '115vw',
    '--to-x': flight.ltr ? '115vw' : '-15vw',
    '--drift-y': `${flight.driftY}vh`,
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[4] overflow-hidden">
      <div
        key={flight.id}
        className="spaceship-wrap"
        style={style as React.CSSProperties}
        onAnimationEnd={() => {
          activeRef.current = false
          setFlight(null)
        }}
      >
        <Saucer flip={!flight.ltr} />
      </div>
    </div>
  )
}
