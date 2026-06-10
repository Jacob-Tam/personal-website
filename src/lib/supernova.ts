/*
  "67" easter-egg supernova. The orb DETONATES when the user types 67: the core flashes bright + pops,
  and every particle is flung outward as shrapnel - each on its own random 3D trajectory at its own
  speed, tumbling and swelling - then the whole thing streams back into orbit. The envelope is a quick
  smoothstep attack to 1 (the blast) then an eased decay to 0 (the shards return) over `duration`. The
  per-piece launch directions/speeds/spin live in OrbParticles; here are the shared scalars. Orb.tsx
  and OrbParticles.tsx both read it (off under reduced motion, gated by the callers).
*/
export const SUPERNOVA = {
  duration: 2.8, // seconds, total
  attack: 0.16, // seconds to the peak (snappy detonation)
  burstDistance: 5.2, // base outward blast distance at the peak (scaled per piece by speedMin..speedMax)
  speedMin: 0.4, // per-piece speed spread, so the shards scatter to different distances
  speedMax: 1.7,
  pieceGrowth: 1.6, // a shard's scale multiplier at the peak (debris reads bigger mid-blast)
  spin: 7.0, // tumble rate (rad/s) of the shards during the blast
  flashEmissive: 5.0, // added to the core emissive at the peak (a little extra glow at detonation)
  coreCollapse: 0.85, // fraction the core scale collapses by at the peak (it blows apart, then reforms)
}

export function supernovaEnvelope(elapsed: number): number {
  if (elapsed <= 0 || elapsed >= SUPERNOVA.duration) return 0
  if (elapsed < SUPERNOVA.attack) {
    const a = elapsed / SUPERNOVA.attack
    return a * a * (3 - 2 * a) // smoothstep up to the peak
  }
  const decay = (elapsed - SUPERNOVA.attack) / (SUPERNOVA.duration - SUPERNOVA.attack)
  return Math.pow(1 - decay, 1.7) // eased fall back to rest (shards linger spread out a touch longer)
}
