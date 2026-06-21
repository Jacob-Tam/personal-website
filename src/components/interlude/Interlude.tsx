// Interlude: the pinned dwell where the orb slows and pulses (orb choreography in useOrbChoreography).
// The text was removed; the section shell stays so the ScrollTrigger pin + orb beat still have a region
// to act over. (Transition-section rework is the next task.)
export function Interlude() {
  return <section id="interlude" className="min-h-svh" aria-hidden />
}
