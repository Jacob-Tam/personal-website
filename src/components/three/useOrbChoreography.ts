import { useEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group, PerspectiveCamera } from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { GROUP, ORB_REVEAL } from '../../lib/constants'
import { BELTS, nearestGapX } from '../../lib/interludeBelts'

type CursorTuning = { lerp: number; clampX: number; clampY: number }
type ChoreographyTuning = {
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
    hero       -> reveals at the start circle, then floats UP to centre; cursor-follow offset, fading out
    interlude  -> descends through two drifting asteroid belts, weaving x to the gap in each (one pulse)
    about      -> drifts upward (driftProgress) from below the belts until it clears the screen
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

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return

    const { mouse, heroProgress, interludeProgress, driftProgress, phase, reducedMotion, orbStarted, orbStartAt } =
      useScrollStore.getState()
    const beat = reducedMotion ? 0 : beatEnvelope(interludeProgress)

    // Idle spin, slowed almost to a stop at the interlude beat. Frozen entirely under reduced motion.
    if (!reducedMotion) {
      group.rotation.y += delta * GROUP.idleSpinY * (1 - choreo.rotationStill * beat)
    }

    // Interlude: the orb descends through two horizontal asteroid belts (InterludeBelts), WEAVING its x
    // to thread the gaps. flightY descends weaveTop -> weaveBottom across the interlude; flightX steers to
    // the gap NEAREST the orb in whichever belt it's crossing (blended by its height between the belts).
    // Both belts' drift + gap positions come from the SHARED interludeBelts model on the SAME clock as the
    // renderer, so the orb always threads a real gap - collision-free by construction. Eased so it never
    // snaps; weaveMix ramps the whole thing in over the first slice so a fast scroll out of the hero
    // doesn't pop the orb sideways. In About/Past the orb holds at the belt bottom and drifts up + off.
    const time = state.clock.elapsedTime
    let flightX = 0
    let flightY = 0
    if (phase === 'hero') {
      // As the hero scrolls out, lift the orb from centre up to the TOP of the belt field so it ARRIVES
      // at weaveTop exactly as the interlude pins - no upward jolt at the seam (it used to sit at centre
      // then rocket up over the first slice of the interlude). Eased so it decelerates into weaveTop,
      // matching the interlude descent's slow start (both ~0 vertical velocity at the seam).
      flightY = smoothstep(0, 1, heroProgress) * BELTS.weaveTop
    } else if (phase === 'interlude') {
      const weaveMix = smoothstep(0, 0.15, interludeProgress)
      const eased = smoothstep(0, 1, interludeProgress)
      const descentY = BELTS.weaveTop + (BELTS.weaveBottom - BELTS.weaveTop) * eased
      // Anchor the gap search to screen centre (0), not the orb's own x, so the orb always threads the
      // central gap and can't ride a gap off-screen if the user parks mid-interlude.
      const upperGap = nearestGapX(0, time, 0)
      const lowerGap = nearestGapX(1, time, 0)
      // 0 at the upper belt's height -> 1 at the lower belt's height; so the orb is exactly on the upper
      // gap as it crosses the upper belt and on the lower gap as it crosses the lower belt.
      const beltBlend = smoothstep(BELTS.upperY, BELTS.lowerY, descentY)
      // Recentre the weave back to x=0 over the last stretch (after the lower belt is threaded at ~0.65),
      // so the orb LEAVES the interlude centred. Without this it carried the swaying gap-x into About and
      // sat off-centre / drifted sideways there. About keeps flightX = 0, so the handoff is continuous at 0.
      const recenter = 1 - smoothstep(0.7, 1, interludeProgress)
      flightX = weaveMix * recenter * (upperGap + (lowerGap - upperGap) * beltBlend)
      // descentY starts at weaveTop (= where the hero lift left the orb), so Y is continuous across the
      // seam; only the horizontal weave eases in (weaveMix) so a fast hero exit can't pop it sideways.
      flightY = descentY
    } else if (phase === 'about' || phase === 'past') {
      flightY = BELTS.weaveBottom + driftProgress * choreo.driftDistance
    }

    // x: circle anchor + faded cursor offset (-> 0 as the hero exits) + the interlude weave.
    // y: same + the interlude descent, then the upward scroll drift through About.
    // The cursor offset fades with the hero exit (cursorFade) AND eases in over the reveal (revealRamp)
    // so the orb appears EXACTLY centred on the start circle - where the click landed - then begins
    // trailing the cursor, instead of snapping to the cursor (which is sitting on the circle at click).
    const elapsed = orbStarted ? (performance.now() - orbStartAt) / 1000 : 0
    const base = phase === 'hero' ? heroBase.current : null
    const cursorFade = reducedMotion ? 0 : 1 - heroProgress
    const revealRamp = orbStarted ? Math.min(1, elapsed / ORB_REVEAL.coreDur) : 0
    const cursorOffsetX = mouse.x * cursor.clampX * cursorFade * revealRamp
    const cursorOffsetY = mouse.y * cursor.clampY * cursorFade * revealRamp
    // After the reveal, the hero orb floats UP from the start circle (where it appeared) to the CENTRE
    // of the hero section (world origin). Time-based (not scroll) and eased; instant once started under
    // reduced motion. baseHold blends the circle anchor out - 1 = on the circle, 0 = at centre - and
    // also fades with the hero scroll-out (cursorFade) so the float and the scroll-out never fight.
    const settleProgress = !orbStarted
      ? 0
      : reducedMotion
        ? 1
        : smoothstep(0, ORB_REVEAL.settleDur, elapsed - ORB_REVEAL.settleStart)
    const baseHold = cursorFade * (1 - settleProgress)
    // flightX/flightY (above) already gate the interlude weave + About drift by phase, so a stale
    // interludeProgress/driftProgress left by a scroll jump can't yank the hero orb around.
    const targetX = (base?.x ?? 0) * baseHold + cursorOffsetX + flightX
    const targetY = (base?.y ?? 0) * baseHold + cursorOffsetY + flightY

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

    // The beat: a brief scale bump on the whole system. On TALL screens the orb (sized by the camera =
    // proportional to viewport height) would grow large and dominate the capped hero name + cover the
    // tagline, which looked off on big Mac displays. Cap its apparent size above ~1000px tall so it stays
    // consistent and balanced; laptops (<=1000px) are unaffected (heightCap = 1).
    const heightCap = Math.min(1, 1000 / size.height)
    group.scale.setScalar((1 + choreo.pulseAmount * beat) * heightCap)
  })
}
