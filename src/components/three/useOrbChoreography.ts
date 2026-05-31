import { type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { CHOREOGRAPHY, GROUP } from '../../lib/constants'

type CursorTuning = { lerp: number; clampX: number; clampY: number }

// Single bump centered on the interlude: ~1 at progress 0.5, ~0 at the edges. Drives the orb's
// one-and-only pulse (scale) and the rotation slow-down.
function beatEnvelope(progress: number) {
  if (progress <= 0 || progress >= 1) return 0
  const x = (progress - 0.5) / 0.22
  return Math.exp(-x * x)
}

/*
  Drives the orb group each frame from the scroll store (docs/03, docs/05). All values are read
  via getState() (no reactive subscription). The full lifecycle:
    hero       -> cursor-follow offset, fading out as heroProgress rises (x settles to 0)
    interlude  -> centered; slows almost to a stop; one scale pulse at the beat
    about      -> drifts upward (driftProgress) until it clears the top of the screen
  Particle shedding is handled in OrbParticles (also off driftProgress). (A bloom bump at the beat
  is deferred: passing a ref to @react-three/postprocessing's <Bloom> triggers a circular-JSON
  crash in its reconciler, so the pulse is scale-only for now.)
*/
export function useOrbChoreography(groupRef: RefObject<Group | null>, cursor: CursorTuning) {
  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const { mouse, heroProgress, interludeProgress, driftProgress, reducedMotion } = useScrollStore.getState()
    const beat = reducedMotion ? 0 : beatEnvelope(interludeProgress)

    // Idle spin, slowed almost to a stop at the interlude beat.
    group.rotation.y += delta * GROUP.idleSpinY * (1 - CHOREOGRAPHY.rotationStill * beat)

    // Target position. x: faded cursor offset (-> 0 as the hero exits). y: faded cursor offset
    // PLUS the upward scroll drift through About.
    const cursorInfluence = reducedMotion ? 0 : 1 - heroProgress
    const targetX = mouse.x * cursor.clampX * cursorInfluence
    const targetY = mouse.y * cursor.clampY * cursorInfluence + driftProgress * CHOREOGRAPHY.driftDistance

    // Frame-rate-independent easing: cursor rate for x, a slightly firmer rate for the y drift.
    const cursorAlpha = 1 - Math.pow(1 - cursor.lerp, delta * 60)
    const driftAlpha = 1 - Math.pow(1 - CHOREOGRAPHY.positionLerp, delta * 60)
    group.position.x += (targetX - group.position.x) * cursorAlpha
    group.position.y += (targetY - group.position.y) * driftAlpha

    // The beat: a brief scale bump on the whole system.
    group.scale.setScalar(1 + CHOREOGRAPHY.pulseAmount * beat)
  })
}
