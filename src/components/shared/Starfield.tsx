// Ambient background starfield: a sparse, faint scatter of white pinpricks behind the whole site,
// deepening the "orb in space" feel without competing with it. Fixed full-viewport, non-interactive,
// sitting just above the 3D canvas (z-[5]) and below the grain + content. Layout is seeded so it's
// stable across reloads; a subset breathes very slowly (see .star-twinkle in index.css, off under
// reduced-motion). Kept deliberately subtle and sparse per docs/09 (no generic twinkly starfield).

const STAR_COUNT = 34
const STAR_SEED = 9921

// Small seeded PRNG so the scatter is deterministic (no re-randomizing / jitter between mounts).
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Star = {
  top: number
  left: number
  size: number
  opacity: number
  twinkle: boolean
  duration: number
  delay: number
}

const STARS: Star[] = (() => {
  const random = mulberry32(STAR_SEED)
  return Array.from({ length: STAR_COUNT }, () => {
    const sizeRoll = random()
    const size = sizeRoll > 0.9 ? 2 : sizeRoll > 0.65 ? 1.5 : 1
    return {
      top: random() * 100,
      left: random() * 100,
      size,
      // Faint, with the larger stars allowed a touch brighter. Capped low so they stay ambient.
      opacity: Math.min(0.24 + random() * 0.32 + (size === 2 ? 0.1 : 0), 0.62),
      twinkle: random() > 0.6,
      duration: 4 + random() * 4, // 4-8s slow breathe
      delay: -random() * 8, // negative offset so they're desynced from the start
    }
  })
})()

export function Starfield() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[5]">
      {STARS.map((star, index) => {
        const style: Record<string, string | number> = {
          top: `${star.top}%`,
          left: `${star.left}%`,
          width: `${star.size}px`,
          height: `${star.size}px`,
        }
        if (star.twinkle) {
          style['--peak'] = star.opacity
          style.animationDuration = `${star.duration}s`
          style.animationDelay = `${star.delay}s`
        } else {
          style.opacity = star.opacity
        }
        return (
          <span
            key={index}
            className={star.twinkle ? 'star star-twinkle' : 'star'}
            style={style as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}
