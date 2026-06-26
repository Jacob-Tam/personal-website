/*
  Interlude "asteroid belts" model. The single source of truth shared by the 3D renderer
  (components/three/InterludeBelts) AND the orb choreography (useOrbChoreography), so the two never
  desync: both compute belt drift + gap positions from the SAME clock via the pure functions below.

  Two horizontal belts (upper + lower) of asteroids SWAY sideways (a slow, bounded oscillation) in
  opposite phase. Each belt is a repeating pattern: a clear GAP every `period`, with the rest filled by
  a short wall of rocks. As the orb descends through the section it steers its x to the gap nearest
  SCREEN CENTRE in whichever belt it is crossing - so it always threads open space (collision-free by
  construction). The two belts' central gaps sway apart, so the orb swings between them = the weave.

  Why sway, not an infinite one-direction scroll: a conveyor would carry the orb's locked gap off-screen
  if the user parks mid-interlude, and a bounded orb would then have to cut THROUGH a wall to reach the
  next gap. Sway amplitude is kept < period/2 so the centre gap never leaves the middle - the orb can
  ride it forever without a wall-crossing.

  Geometry lives in the orb's world plane (z ~ 0), same space as the orb, so threading is exact.
*/

export const BELTS = {
  // Belt heights (world y) and the orb's vertical travel across the interlude (enters above the upper
  // belt, exits below the lower belt). Visible half-height at the orb plane is ~2.8, so these are on-screen.
  upperY: 0.95,
  lowerY: -0.95,
  weaveTop: 2.2, // orb y at interlude start (above the upper belt)
  weaveBottom: -2.2, // orb y at interlude end (below the lower belt)

  // Belt pattern. clear gap width ~ 2*(gapWidth/2 + margin); the wall fills the rest of each period.
  period: 4.0, // world-x distance between consecutive gaps
  gapWidth: 1.7, // base clear width reserved for the gap (the orb core is ~0.8 wide -> roomy)
  margin: 0.25, // extra clear space between the gap edge and the first rock
  fillPerPeriod: 4, // rocks forming the wall between two gaps
  nPeriods: 4, // periods generated per belt (also sets the wrap width, so the sway loops seamlessly)
  // Sway: bounded horizontal oscillation. swayAmp MUST stay < period/2 (2.0) so the centre gap never
  // leaves the middle of the screen (no wall-crossing). Uneven speeds so the two belts don't lock in sync.
  swayAmp: 1.5,
  swaySpeed: [0.55, -0.62] as const, // rad/s; opposite signs + different magnitudes = organic, drifting weave

  // Dark, cool space rock that fits the site palette: a neutral-cool grey base, with the single blue
  // accent reserved for the fresnel RIM (applied in InterludeBelts) - echoing the orb's blue rim.
  color: '#565d66',
  emissive: '#161d27', // faint cool glow so the shadowed sides still read against the black
  sizeMin: 0.22,
  sizeMax: 0.5,
  yJitter: 0.18, // per-rock vertical scatter so the belt isn't a perfect line
  zMin: -0.6, // depth scatter around the orb plane (z=0)
  zMax: 0.25,
  spin: 0.3, // max per-rock idle spin (rad/s)
}

const SPAN_X = (BELTS.nPeriods * BELTS.period) / 2 // half the populated width
const WRAP_W = BELTS.nPeriods * BELTS.period // a whole number of periods, so wrapping preserves the gaps

// Seeded PRNG (mulberry32) so the rock scatter is identical every load.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (t: number) => t * t * (3 - 2 * t)

// Wrap an x back into [-SPAN_X, SPAN_X). Because WRAP_W is an exact multiple of `period`, a rock that
// drifts off one edge reappears on the other exactly where the pattern continues - gaps stay aligned.
export function wrapX(x: number) {
  return ((((x + SPAN_X) % WRAP_W) + WRAP_W) % WRAP_W) - SPAN_X
}

// A belt's horizontal sway offset at a given time (bounded to +/-swayAmp). time = the R3F clock,
// shared by both readers so the rocks and the orb's gap target always agree.
export function beltDrift(belt: number, time: number) {
  return BELTS.swayAmp * Math.sin(time * BELTS.swaySpeed[belt])
}

// The x of the gap CENTRE nearest `x` in a belt at `time`. Gaps sit at k*period + sway for integer k.
// The orb anchors this to screen centre (x=0); since swayAmp < period/2, that always resolves to the
// same central gap (k=0), so the orb never has to jump between gaps mid-descent.
export function nearestGapX(belt: number, time: number, x: number) {
  const drift = beltDrift(belt, time)
  const k = Math.round((x - drift) / BELTS.period)
  return k * BELTS.period + drift
}

// Whole-belt opacity across the interlude: the rocks EMERGE from the dark over the first quarter and
// DISSOLVE back into it over the last quarter (wide, eased windows so neither end pops). Both windows
// close well before the orb's belt crossings (~0.34 and ~0.65), so the rocks are at full opacity through
// both threads. fade is exactly 0 at progress 0 and 1 (the phase boundaries), so the visibility toggle
// never cuts a visible rock.
export function beltFade(progress: number) {
  const fadeIn = smooth(clamp01(progress / 0.25))
  const fadeOut = smooth(clamp01((1 - progress) / 0.25))
  return fadeIn * fadeOut
}

export type Asteroid = {
  belt: number
  baseX: number // pre-drift x slot (drift + wrap applied live)
  y: number
  z: number
  scale: number
  rot: [number, number, number] // initial rotation
  rotRate: [number, number, number] // idle spin per axis (rad/s)
}

// Build the fixed rock set once. Each rock has a stable slot in the wall between two gaps; its live x is
// wrapX(baseX + beltDrift). The gap (centred at k*period) is left clear because no rock is placed there.
export function makeAsteroids(): Asteroid[] {
  const rand = mulberry32(1337)
  const out: Asteroid[] = []
  const fillSpan = BELTS.period - BELTS.gapWidth - 2 * BELTS.margin // width of the wall between gaps
  for (let belt = 0; belt < 2; belt++) {
    const beltY = belt === 0 ? BELTS.upperY : BELTS.lowerY
    for (let k = 0; k < BELTS.nPeriods; k++) {
      for (let j = 0; j < BELTS.fillPerPeriod; j++) {
        const along =
          BELTS.fillPerPeriod > 1 ? (j / (BELTS.fillPerPeriod - 1)) * fillSpan : fillSpan / 2
        const baseX = k * BELTS.period + BELTS.gapWidth / 2 + BELTS.margin + along
        out.push({
          belt,
          baseX,
          y: beltY + (rand() * 2 - 1) * BELTS.yJitter,
          z: BELTS.zMin + rand() * (BELTS.zMax - BELTS.zMin),
          scale: BELTS.sizeMin + rand() * (BELTS.sizeMax - BELTS.sizeMin),
          rot: [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2],
          rotRate: [
            (rand() * 2 - 1) * BELTS.spin,
            (rand() * 2 - 1) * BELTS.spin,
            (rand() * 2 - 1) * BELTS.spin,
          ],
        })
      }
    }
  }
  return out
}
