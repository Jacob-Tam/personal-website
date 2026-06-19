import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { PROJECTS_JOURNEY } from '../../lib/constants'

const ST = PROJECTS_JOURNEY.stars

/*
  The Projects journey "flying through space" backdrop: a corridor of faint star streaks that stream
  past the journey camera the whole time the pin is engaged. A slow constant drift (baseDrift/`drift`)
  keeps the field alive while you read a project; it accelerates into warp streaks with SCROLL VELOCITY
  as you travel to the next one - the streak length tracks the projectsProgress rate, so the background
  reads as "we are moving through space to get there". One LineSegments (2 verts per star: a head at the
  current position and a tail trailing in -Z) updated in place each frame, recycled endlessly from the
  near end of the corridor back to the far end, so it never empties and never allocates per frame.

  Mounted inside ProjectsScene's `active` group, so it is hidden (and its frame loop early-returns) any
  time the journey pin is not engaged. A SEPARATE system from the ambient CSS shared/Starfield.
*/
export function JourneyStars({
  active,
  camZ,
  drift,
  boost,
}: {
  active: boolean
  camZ: number
  drift: number
  boost: number
}) {
  const ref = useRef<THREE.LineSegments>(null!)
  const prevProgress = useRef(0)
  const speed = useRef(drift) // smoothed world speed (units/s), eased toward the scroll-driven target

  // Seeded star positions filling the corridor, so the field is full on the first active frame (no
  // empty flash) and stable across reloads. Each star is 2 verts: head [0..2] + tail [3..5].
  const geometry = useMemo(() => {
    const positions = new Float32Array(ST.count * 2 * 3)
    let seed = 20260603
    const rand = () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    const recycleZ = camZ + ST.near
    for (let i = 0; i < ST.count; i++) {
      const x = (rand() * 2 - 1) * ST.spreadX
      const y = (rand() * 2 - 1) * ST.spreadY
      const z = recycleZ - rand() * ST.depth
      positions[i * 6 + 0] = x
      positions[i * 6 + 1] = y
      positions[i * 6 + 2] = z
      positions[i * 6 + 3] = x
      positions[i * 6 + 4] = y
      positions[i * 6 + 5] = z - ST.streakMin // a near-point until the frame loop stretches it
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [camZ])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    if (!active) return
    const dt = Math.min(delta, 0.05) // clamp so a tab-restore frame does not jump the whole field

    // Scroll velocity from the shared projectsProgress (abs so scrubbing either way reads as forward
    // travel); the field warps with it. The scrub smoothing on the pin already eases progress, so this
    // settles back to the coast speed shortly after you stop scrolling.
    const progress = useScrollStore.getState().projectsProgress
    const progressVel = Math.abs(progress - prevProgress.current) / Math.max(dt, 1e-4)
    prevProgress.current = progress

    const target = Math.min(drift + progressVel * boost, ST.maxSpeed)
    speed.current += (target - speed.current) * Math.min(dt * 6, 1) // ease toward target (no jitter)

    const streak = THREE.MathUtils.clamp(speed.current * ST.streakScale, ST.streakMin, ST.streakMax)
    const recycleZ = camZ + ST.near
    const step = speed.current * dt
    const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array

    for (let i = 0; i < ST.count; i++) {
      let x = arr[i * 6 + 0]
      let y = arr[i * 6 + 1]
      let z = arr[i * 6 + 2] + step
      if (z > recycleZ) {
        // Passed the camera: wrap back to the far end with a fresh lateral position.
        z -= ST.depth
        x = (Math.random() * 2 - 1) * ST.spreadX
        y = (Math.random() * 2 - 1) * ST.spreadY
      }
      arr[i * 6 + 0] = x
      arr[i * 6 + 1] = y
      arr[i * 6 + 2] = z
      arr[i * 6 + 3] = x
      arr[i * 6 + 4] = y
      arr[i * 6 + 5] = z - streak // tail trails behind the direction of travel
    }
    attr.needsUpdate = true

    // Wake the field up as it speeds up: faint while reading, a touch brighter while travelling. An
    // intro/outro envelope eases the whole field in as the journey starts and out as it releases, so it
    // never pops in at full strength at the pin edges (smoother About -> Projects entry).
    const speedFactor = THREE.MathUtils.clamp((speed.current - drift) / Math.max(ST.maxSpeed - drift, 1e-4), 0, 1)
    const warmth = ST.opacityBase + speedFactor * (ST.opacityPeak - ST.opacityBase)
    const envelope =
      THREE.MathUtils.smoothstep(progress, 0, ST.fadeIn) * (1 - THREE.MathUtils.smoothstep(progress, 1 - ST.fadeOut, 1))
    const material = ref.current.material as THREE.LineBasicMaterial
    material.opacity = warmth * envelope
  })

  return (
    // frustumCulled off: the geometry's bounds are computed once but the stars move, so culling on the
    // stale bounds could blink the whole field out. Additive + depthWrite off so streaks layer softly
    // and never occlude the planets (the planets still occlude stars behind them via depth test).
    <lineSegments ref={ref} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        color={ST.color}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </lineSegments>
  )
}
