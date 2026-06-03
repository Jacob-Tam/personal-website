import { PROJECTS_JOURNEY as J } from './constants'

/*
  Pure math for the Projects "solar system journey", shared by the 3D planets (read in useFrame,
  three/JourneyPlanet) and the 2D media/text panels (read in a rAF loop, projects/Projects). Both
  consume the SAME projectsProgress so the canvas and the DOM stay in lockstep. No React, no Three -
  just numbers, so it is trivial to reason about and to tune.

  Per planet i: a beat centred at (i + 0.5) / count. The signed local phase
    s = (progress - center) / life
  runs ~-1 (entering, far right) -> 0 (arrived, near right) -> +1 (exited, off left). `life` is wider
  than half the beat spacing, so consecutive planets overlap and cross-fade.
*/

export type Vec3 = [number, number, number]

// The leva-tunable spatial inputs (positions in world units + the arrive dim/recede behaviour).
export type JourneyLook = {
  enter: Vec3
  arrive: Vec3
  exit: Vec3
  dim: number
  recede: boolean
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

const beatCenter = (index: number) => (index + 0.5) / J.count
const localPhase = (progress: number, index: number) => (progress - beatCenter(index)) / J.life

export type PlanetMotion = {
  position: Vec3
  opacity: number // mesh fade: in from the distance, out as it exits (0 outside its beat)
  brightness: number // 1 while travelling in, dims toward (1 - dim) at/after arrive
  visible: boolean // false when fully faded, so the mesh can be skipped (draw-call saver)
}

// Drives one 3D planet. `look` carries the leva spatial params (positions differ from the constants
// only while tuning); the timing all comes from PROJECTS_JOURNEY so it matches the DOM panels.
export function planetMotion(progress: number, index: number, look: JourneyLook): PlanetMotion {
  const s = localPhase(progress, index)
  const sc = clamp(s, -1, 1)

  const position =
    sc <= 0
      ? mix3(look.enter, look.arrive, smoothstep(0, 1, sc + 1)) // enter -> arrive
      : mix3(look.arrive, look.exit, smoothstep(0, 1, sc)) //        arrive -> exit
  position[1] += J.planetY[index] ?? 0

  // Fade the mesh in over its leading edge and out over its trailing edge; nothing outside its beat.
  let opacity = 0
  if (s > -1 && s < 1) {
    const rise = smoothstep(-1, -1 + J.fadeFrac, s)
    const fall = 1 - smoothstep(1 - J.fadeFrac, 1, s)
    opacity = Math.min(rise, fall)
  }
  // Fully-disappear mode: drop out right after arrive instead of lingering as a dim backdrop.
  if (!look.recede) opacity *= 1 - smoothstep(0, J.disappearRange, s)
  // Whole-scene intro/outro so planet 1 fades in as the pin engages and the last clears as it releases.
  opacity *= smoothstep(0, J.introFade, progress) * (1 - smoothstep(1 - J.outroFade, 1, progress))

  const brightness = 1 - look.dim * smoothstep(J.dimStart, J.dimStart + J.dimRange, s)

  return { position, opacity, brightness, visible: opacity > 0.001 }
}

// 2D panel opacity for project i: a smooth window around arrive (s = 0). Timing only, so it always
// matches planetMotion regardless of the (leva-tuned) planet positions.
export function panelOpacity(progress: number, index: number): number {
  const s = localPhase(progress, index)
  return smoothstep(0, 1, clamp((J.panelHalf - Math.abs(s)) / J.panelFade, 0, 1))
}

// The project nearest its arrive beat (within the panel window), else -1. Used to play only the
// active project's video. Changes a handful of times across the journey, so it can drive React state.
export function journeyActiveIndex(progress: number): number {
  let best = -1
  let bestAbs = J.panelHalf
  for (let i = 0; i < J.count; i++) {
    const abs = Math.abs(localPhase(progress, i))
    if (abs < bestAbs) {
      best = i
      bestAbs = abs
    }
  }
  return best
}
