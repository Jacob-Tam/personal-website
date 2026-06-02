/*
  "67" easter-egg supernova. A brief, eased pulse the orb plays when the user types 67: the core
  flashes brighter + swells, the particles burst outward then ease back into orbit. The envelope is
  a quick smoothstep attack to 1 then an eased decay to 0 over `duration`. Orb.tsx and
  OrbParticles.tsx both read it (off under reduced motion, gated by the callers).
*/
export const SUPERNOVA = {
  duration: 1.8, // seconds, total
  attack: 0.14, // seconds to the peak
  burstDistance: 2.2, // units the particles expand outward at the peak
  flashEmissive: 1.5, // added to the core emissive at the peak
  coreSwell: 0.4, // added to the core scale at the peak
}

export function supernovaEnvelope(elapsed: number): number {
  if (elapsed <= 0 || elapsed >= SUPERNOVA.duration) return 0
  if (elapsed < SUPERNOVA.attack) {
    const a = elapsed / SUPERNOVA.attack
    return a * a * (3 - 2 * a) // smoothstep up to the peak
  }
  const decay = (elapsed - SUPERNOVA.attack) / (SUPERNOVA.duration - SUPERNOVA.attack)
  return Math.pow(1 - decay, 2.2) // eased fall back to rest
}
