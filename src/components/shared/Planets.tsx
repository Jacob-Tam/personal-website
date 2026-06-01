// Small, dim planets drifting very slowly far behind the site - distant muted spheres (soft CSS
// radial-gradient bodies lit from the upper-left, near-monochrome with one faint accent-tinted
// world) that deepen the space backdrop alongside the starfield. Fixed full-viewport at z-[4]
// (behind the stars, in front of the canvas), non-interactive. Each drifts on a long, eased,
// alternating path - minutes per cycle - so the motion reads as barely-there; off under reduced
// motion (see index.css). Hand-placed (not seeded) so the composition stays intentional: toward
// the edges/corners and clear of the orb + hero name.

type Planet = {
  top: number
  left: number
  size: number
  palette: 'slate' | 'cool' | 'accent'
  dx: number // slow drift delta (px), eased + alternating
  dy: number
  duration: number // seconds for one direction of the drift
  delay: number // negative offset so they're desynced
}

const PLANETS: Planet[] = [
  { top: 34, left: -1, size: 60, palette: 'slate', dx: 44, dy: 28, duration: 158, delay: -20 },
  { top: 20, left: 89, size: 28, palette: 'cool', dx: -36, dy: 24, duration: 122, delay: -64 },
  { top: 72, left: 6, size: 44, palette: 'cool', dx: 32, dy: -26, duration: 176, delay: -40 },
  { top: 84, left: 84, size: 70, palette: 'accent', dx: -28, dy: -32, duration: 196, delay: -92 },
  { top: 60, left: 93, size: 22, palette: 'slate', dx: 24, dy: 34, duration: 112, delay: -15 },
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
          '--dx': `${planet.dx}px`,
          '--dy': `${planet.dy}px`,
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
