import { useEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group, PerspectiveCamera } from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { GROUP, ORB_REVEAL } from '../../lib/constants'

type CursorTuning = { lerp: number; clampX: number; clampY: number }
type ChoreographyTuning = {
  interludeRadius: number
  interludeRadiusY: number
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

// Smoothstep easing across [edge0, edge1].
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
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
  // circle sits. Computed from the circle's centre projected onto the orb plane (world z = 0), once +
  // on resize/font load (not per frame), so it's robust to layout/viewport with no hand-tuning.
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const heroBase = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const compute = () => {
      const el = document.querySelector('.orb-start')
      if (!el) return
      const rect = el.getBoundingClientRect()
      // Measure the circle in DOCUMENT space (add the scroll offset) so this is scroll-independent: the
      // hero sits at document top, so its document position equals its viewport position at the frame
      // this anchor is actually used (heroProgress 0, page at top). Without the offset, a re-run while
      // scrolled - a canvas resize fires one when the scrollbar toggles as a pin engages - would measure
      // the circle off-screen and park the orb's hero rest spot at the top of the screen.
      const cx = rect.left + rect.width / 2 + window.scrollX
      const cy = rect.top + rect.height / 2 + window.scrollY
      const ndcX = (cx / size.width) * 2 - 1
      const ndcY = -(cy / size.height) * 2 + 1
      const halfHeight = Math.tan(((camera as PerspectiveCamera).fov * Math.PI) / 360) * camera.position.z
      heroBase.current = { x: ndcX * halfHeight * (size.width / size.height), y: ndcY * halfHeight }
    }
    compute()
    document.fonts?.ready.then(compute) // fonts can reflow the name (and shift the circle) after mount
  }, [camera, size])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const { mouse, heroProgress, interludeProgress, driftProgress, phase, reducedMotion, orbStarted, orbStartAt } =
      useScrollStore.getState()
    const beat = reducedMotion ? 0 : beatEnvelope(interludeProgress)

    // Idle spin, slowed almost to a stop at the interlude beat. Frozen entirely under reduced motion.
    if (!reducedMotion) {
      group.rotation.y += delta * GROUP.idleSpinY * (1 - choreo.rotationStill * beat)
    }

    // Interlude: the orb ORBITS the centered text on a wide, short ellipse - in from ABOVE, around the
    // RIGHT side, and down to BELOW it (so it travels WITH the downward scroll). Smoothstep eases it
    // in/out so there is no snap. theta: +pi/2 (top) -> 0 (right) -> -pi/2 (bottom). The wide, short
    // ellipse keeps it hugging the one-line text and never riding too high above it.
    // The orbit eases IN over the first slice of the interlude rather than snapping on at the phase
    // boundary, so a fast scroll out of the hero doesn't pop the orb up to the top of the arc.
    const orbitMix = phase === 'hero' ? 0 : smoothstep(0, 0.2, interludeProgress)
    const eased = interludeProgress * interludeProgress * (3 - 2 * interludeProgress)
    const theta = (0.5 - eased) * Math.PI
    const orbitX = choreo.interludeRadius * Math.cos(theta)
    const orbitY = choreo.interludeRadiusY * Math.sin(theta)

    // x: circle anchor + faded cursor offset (-> 0 as the hero exits) + the interlude arc.
    // y: same + the interlude arc + the upward scroll drift through About.
    // The cursor offset fades with the hero exit (cursorFade) AND eases in over the reveal (revealRamp)
    // so the orb appears EXACTLY centred on the start circle - where the click landed - then begins
    // trailing the cursor, instead of snapping to the cursor (which is sitting on the circle at click).
    const base = phase === 'hero' ? heroBase.current : null
    const cursorFade = reducedMotion ? 0 : 1 - heroProgress
    const revealRamp = orbStarted
      ? Math.min(1, (performance.now() - orbStartAt) / 1000 / ORB_REVEAL.coreDur)
      : 0
    const cursorOffsetX = mouse.x * cursor.clampX * cursorFade * revealRamp
    const cursorOffsetY = mouse.y * cursor.clampY * cursorFade * revealRamp
    // Drift only applies once we're actually in the upward phases. Gating by phase (not just trusting
    // the raw value) keeps a stale driftProgress - ScrollTrigger can leave it non-zero after a jump /
    // scroll-restore - from yanking the hero/interlude orb off the top of the screen.
    const drift = phase === 'about' || phase === 'past' ? driftProgress : 0
    const targetX = (base?.x ?? 0) * cursorFade + cursorOffsetX + orbitMix * orbitX
    const targetY =
      (base?.y ?? 0) * cursorFade + cursorOffsetY + orbitMix * orbitY + drift * choreo.driftDistance

    // Frame-rate-independent easing. The hero starts floaty (cursor trailing) and tightens toward the
    // fast orbit ease as it scrolls out (ramped by heroProgress) - so the rate doesn't jump at the
    // phase boundary and the orb doesn't lag-then-snap on a fast scroll. Past the hero it stays fast so
    // the orb tracks the interlude orbit/drift closely. First frame after (re)mount snaps (alpha 1).
    const orbitLerp = 0.32
    const exit = phase === 'hero' ? heroProgress : 1
    const cursorRate = cursor.lerp + (orbitLerp - cursor.lerp) * exit
    const yRate = choreo.positionLerp + (orbitLerp - choreo.positionLerp) * exit
    const cursorAlpha = settled.current ? 1 - Math.pow(1 - cursorRate, delta * 60) : 1
    const driftAlpha = settled.current ? 1 - Math.pow(1 - yRate, delta * 60) : 1
    group.position.x += (targetX - group.position.x) * cursorAlpha
    group.position.y += (targetY - group.position.y) * driftAlpha
    settled.current = true
    ;(window as unknown as { __orb: unknown }).__orb = {
      x: +group.position.x.toFixed(2), y: +group.position.y.toFixed(2),
      tx: +targetX.toFixed(2), ty: +targetY.toFixed(2), phase, ip: +interludeProgress.toFixed(2),
    }

    // The beat: a brief scale bump on the whole system.
    group.scale.setScalar(1 + choreo.pulseAmount * beat)
  })
}
