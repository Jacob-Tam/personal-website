import { useEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group, PerspectiveCamera } from 'three'
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
    hero       -> rests at the start circle, cursor-follow offset, fading out as heroProgress rises
    interlude  -> arcs clockwise around the centered text (above -> right -> below), one pulse
    about      -> drifts upward (driftProgress) from below the text until it clears the screen
  Particle shedding is handled in OrbParticles (also off driftProgress).
*/
export function useOrbChoreography(
  groupRef: RefObject<Group | null>,
  cursor: CursorTuning,
  choreo: ChoreographyTuning,
) {
  // The orb group unmounts during the Projects journey and remounts at the origin afterward; the
  // position below is normally lerped, so a fresh mount would ease in from center. Snap straight to
  // the scroll-derived target on the first frame after (re)mount so it appears in the right place
  // (e.g. already off-screen when phase is 'past'), then lerp as usual. The position is a pure
  // function of scroll state, so snapping is always correct - the lerp is only for in-motion smoothing.
  const settled = useRef(false)

  // Hero resting spot, anchored to the START CIRCLE (Hero.tsx) so the orb reveals EXACTLY where the
  // circle sits. Computed from the circle's on-screen centre projected onto the orb plane (world z = 0),
  // once + on resize/font load (not per frame), so it's robust to layout/viewport with no hand-tuning.
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const heroBase = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const compute = () => {
      const el = document.querySelector('.orb-start')
      if (!el) return
      const rect = el.getBoundingClientRect()
      const ndcX = ((rect.left + rect.width / 2) / size.width) * 2 - 1
      const ndcY = -((rect.top + rect.height / 2) / size.height) * 2 + 1
      const halfHeight = Math.tan(((camera as PerspectiveCamera).fov * Math.PI) / 360) * camera.position.z
      heroBase.current = { x: ndcX * halfHeight * (size.width / size.height), y: ndcY * halfHeight }
    }
    compute()
    document.fonts?.ready.then(compute) // fonts can reflow the name (and shift the circle) after mount
  }, [camera, size])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const { mouse, heroProgress, interludeProgress, driftProgress, phase, reducedMotion } =
      useScrollStore.getState()
    const beat = reducedMotion ? 0 : beatEnvelope(interludeProgress)

    // Idle spin, slowed almost to a stop at the interlude beat. Frozen entirely under reduced motion.
    if (!reducedMotion) {
      group.rotation.y += delta * GROUP.idleSpinY * (1 - choreo.rotationStill * beat)
    }

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

    // x: circle anchor + faded cursor offset (-> 0 as the hero exits) + the interlude arc.
    // y: same + the interlude arc + the upward scroll drift through About.
    const base = phase === 'hero' ? heroBase.current : null
    const cursorInfluence = reducedMotion ? 0 : 1 - heroProgress
    const targetX = ((base?.x ?? 0) + mouse.x * cursor.clampX) * cursorInfluence + interludeActive * orbitX
    const targetY =
      ((base?.y ?? 0) + mouse.y * cursor.clampY) * cursorInfluence +
      interludeActive * orbitY +
      driftProgress * choreo.driftDistance

    // Frame-rate-independent easing: cursor rate for x, the choreography rate for the y drift.
    // First frame after (re)mount snaps (alpha 1) so the orb never eases in from the origin.
    const cursorAlpha = settled.current ? 1 - Math.pow(1 - cursor.lerp, delta * 60) : 1
    const driftAlpha = settled.current ? 1 - Math.pow(1 - choreo.positionLerp, delta * 60) : 1
    group.position.x += (targetX - group.position.x) * cursorAlpha
    group.position.y += (targetY - group.position.y) * driftAlpha
    settled.current = true

    // The beat: a brief scale bump on the whole system.
    group.scale.setScalar(1 + choreo.pulseAmount * beat)
  })
}
