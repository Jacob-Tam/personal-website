// A few small, dim planets drifting slowly far behind the site - distant muted spheres (soft CSS
// radial-gradient bodies lit from the upper-left with a faint glow, near-monochrome plus one faint
// accent-tinted world) that deepen the space backdrop alongside the starfield. Fixed full-viewport
// at z-[4] (behind the stars, in front of the canvas), non-interactive. Each drifts on a slow
// circular path around its resting spot (tens of seconds per orbit) - gentle but perceptible;
// disabled under reduced motion (see index.css). Hand-placed (not seeded) so the composition stays
// intentional: small, toward the edges/corners, and clear of the orb + hero name + nav.

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

export function Planets() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[4]">
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
        return (
          <span
            key={index}
            className={`planet planet-${planet.palette}`}
            style={style as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}
