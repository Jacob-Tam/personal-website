import { type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { GROUP } from '../../lib/constants'

type CursorTuning = { lerp: number; clampX: number; clampY: number }
type ChoreographyTuning = {
  interludeRadius: number
  driftDistance: number
  positionLerp: number
  pulseAmount: number
  rotationStill: number
}

// Single bump centered on the interlude: ~1 at progress 0.5, ~0 at the edges. Drives the orb's
// one-and-only pulse (scale) and the rotation slow-down.
function beatEnvelope(progress: number) {
  if (progress <= 0 || progress >= 1) return 0
  const x = (progress - 0.5) / 0.22
  return Math.exp(-x * x)
}

/*
  Drives the orb group each frame from the scroll store (docs/03, docs/05). All values are read
  via getState() (no reactive subscription). Tuning values come from the dev leva 'choreography'
  folder (defaults baked in lib/constants). The full lifecycle:
    hero       -> cursor-follow offset, fading out as heroProgress rises (x settles to 0)
    interlude  -> arcs clockwise around the centered text (above -> right -> below), one pulse
    about      -> drifts upward (driftProgress) from below the text until it clears the screen
  Particle shedding is handled in OrbParticles (also off driftProgress).
*/
export function useOrbChoreography(
  groupRef: RefObject<Group | null>,
  cursor: CursorTuning,
  choreo: ChoreographyTuning,
) {
  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const { mouse, heroProgress, interludeProgress, driftProgress, phase, reducedMotion } =
      useScrollStore.getState()
    const beat = reducedMotion ? 0 : beatEnvelope(interludeProgress)

    // Idle spin, slowed almost to a stop at the interlude beat.
    group.rotation.y += delta * GROUP.idleSpinY * (1 - choreo.rotationStill * beat)

    // Interlude: the orb arcs CLOCKWISE around the centered text - starts above it, swings through
    // the right, ends below it at horizontal center. Smoothstep eases the arc in/out so there is no
    // snap at the start. theta: +pi/2 (top) -> 0 (right) -> -pi/2 (bottom). Active from the
    // interlude onward; during About the arc holds at the bottom (0, -radius) and the drift lifts
    // it from there up and off the screen.
    const interludeActive = phase === 'hero' ? 0 : 1
    const eased = interludeProgress * interludeProgress * (3 - 2 * interludeProgress)
    const theta = (0.5 - eased) * Math.PI
    const orbitX = choreo.interludeRadius * Math.cos(theta)
    const orbitY = choreo.interludeRadius * Math.sin(theta)

    // x: faded cursor offset (-> 0 as the hero exits) + the interlude arc.
    // y: faded cursor offset + the interlude arc + the upward scroll drift through About.
    const cursorInfluence = reducedMotion ? 0 : 1 - heroProgress
    const targetX = mouse.x * cursor.clampX * cursorInfluence + interludeActive * orbitX
    const targetY =
      mouse.y * cursor.clampY * cursorInfluence + interludeActive * orbitY + driftProgress * choreo.driftDistance

    // Frame-rate-independent easing: cursor rate for x, the choreography rate for the y drift.
    const cursorAlpha = 1 - Math.pow(1 - cursor.lerp, delta * 60)
    const driftAlpha = 1 - Math.pow(1 - choreo.positionLerp, delta * 60)
    group.position.x += (targetX - group.position.x) * cursorAlpha
    group.position.y += (targetY - group.position.y) * driftAlpha

    // The beat: a brief scale bump on the whole system.
    group.scale.setScalar(1 + choreo.pulseAmount * beat)
  })
}
