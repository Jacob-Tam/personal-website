import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { ORB_REVEAL, SEED, SHED } from '../../lib/constants'
import { SUPERNOVA, supernovaEnvelope } from '../../lib/supernova'

export type ParticleProps = {
  count: number
  planes: number
  radiusMin: number
  radiusMax: number
  speedMin: number
  speedMax: number
  sizeMin: number
  sizeMax: number
  hueMin: number
  hueMax: number
  purpleFraction: number
  purpleHueMin: number
  purpleHueMax: number
  saturation: number
  lightnessMin: number
  lightnessMax: number
  brightness: number
}

// Tiny deterministic PRNG so the particle layout is identical on every load (docs/04: reads
// as designed, not a random fuzzy cloud).
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/*
  ~50 particles orbiting the core on a few tilted rings (stylized Bohr atom), drawn as ONE
  instanced mesh. Each frame, position is a pure function of elapsed time (frame-rate
  independent). Depth is sold by scene fog.

  Shedding (docs/05): as the orb drifts up through About (driftProgress), a growing fraction of
  particles "release" - each has a release threshold; once driftProgress passes it the particle
  drifts up + slightly outward and fades, so the orb has noticeably fewer particles by the time
  it leaves. driftProgress is read via getState() (no reactive subscription).
*/
export function OrbParticles(props: ParticleProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const outward = useMemo(() => new THREE.Vector3(), [])
  const spinVec = useMemo(() => new THREE.Vector3(), [])
  const scratchColor = useMemo(() => new THREE.Color(), [])
  const baseColors = useRef<Float32Array>(new Float32Array(0))
  const wasShedding = useRef(false)
  // Used to force a render after the colour/brightness effects when the canvas runs frameloop
  // 'demand' (reduced motion) - otherwise the static frame can paint before the colours apply.
  const invalidate = useThree((state) => state.invalidate)

  const { plane, radius, speed, phase, size, releaseAt, planeMatrices, explodeDir, explodeSpeed, spinAxis, spinRate } = useMemo(() => {
    const rng = mulberry32(SEED)
    const planeCount = Math.max(1, props.planes)

    // Per plane: a tilt, a base radius (rings nest from inner to outer), and one rigid angular
    // speed + direction. Sharing speed + base radius across a plane keeps it reading as a clean
    // tilted RING (docs/04 C4). Size, phase spacing, and a tiny radius jitter vary per particle.
    const planeMatrices: THREE.Matrix4[] = []
    const planeRadius: number[] = []
    const planeSpeed: number[] = []
    const planeCounts = new Array(planeCount).fill(0)
    for (let i = 0; i < props.count; i++) planeCounts[i % planeCount]++

    for (let p = 0; p < planeCount; p++) {
      const euler = new THREE.Euler(
        (rng() - 0.5) * Math.PI,
        (p / planeCount) * Math.PI + (rng() - 0.5) * 0.6,
        (rng() - 0.5) * Math.PI,
      )
      planeMatrices.push(new THREE.Matrix4().makeRotationFromEuler(euler))
      const t = planeCount > 1 ? p / (planeCount - 1) : 0.5
      planeRadius.push(THREE.MathUtils.lerp(props.radiusMin, props.radiusMax, t))
      const magnitude = THREE.MathUtils.lerp(props.speedMin, props.speedMax, rng())
      planeSpeed.push(rng() < 0.5 ? -magnitude : magnitude)
    }

    const plane = new Int32Array(props.count)
    const radius = new Float32Array(props.count)
    const speed = new Float32Array(props.count)
    const phase = new Float32Array(props.count)
    const size = new Float32Array(props.count)
    const releaseAt = new Float32Array(props.count)
    const seenOnPlane = new Array(planeCount).fill(0)
    const rngShed = mulberry32(SEED + 2) // separate stream so it does not disturb the layout
    for (let i = 0; i < props.count; i++) {
      const p = i % planeCount
      const k = seenOnPlane[p]++
      plane[i] = p
      phase[i] = (k / planeCounts[p]) * Math.PI * 2 + (rng() - 0.5) * 0.4
      radius[i] = planeRadius[p] + (rng() - 0.5) * 0.12
      speed[i] = planeSpeed[p]
      size[i] = THREE.MathUtils.lerp(props.sizeMin, props.sizeMax, rng())
      releaseAt[i] = THREE.MathUtils.lerp(SHED.startFraction, 0.95, rngShed())
    }

    // Per-particle EXPLOSION vectors for the "67" supernova: a random 3D launch direction (uniform on
    // the sphere) + a speed spread, plus a tumble axis/rate. A separate rng stream so it can't shift
    // the orbit layout (or the colour stream) above.
    const rngBoom = mulberry32(SEED + 3)
    const randomUnit = () => {
      const u = rngBoom() * 2 - 1
      const t = rngBoom() * Math.PI * 2
      const r = Math.sqrt(Math.max(0, 1 - u * u))
      return [r * Math.cos(t), r * Math.sin(t), u] as const
    }
    const explodeDir = new Float32Array(props.count * 3)
    const explodeSpeed = new Float32Array(props.count)
    const spinAxis = new Float32Array(props.count * 3)
    const spinRate = new Float32Array(props.count)
    for (let i = 0; i < props.count; i++) {
      const [dx, dy, dz] = randomUnit()
      explodeDir[i * 3] = dx
      explodeDir[i * 3 + 1] = dy
      explodeDir[i * 3 + 2] = dz
      explodeSpeed[i] = THREE.MathUtils.lerp(SUPERNOVA.speedMin, SUPERNOVA.speedMax, rngBoom())
      const [sx, sy, sz] = randomUnit()
      spinAxis[i * 3] = sx
      spinAxis[i * 3 + 1] = sy
      spinAxis[i * 3 + 2] = sz
      spinRate[i] = (0.6 + 0.8 * rngBoom()) * SUPERNOVA.spin * (rngBoom() < 0.5 ? -1 : 1)
    }

    return { plane, radius, speed, phase, size, releaseAt, planeMatrices, explodeDir, explodeSpeed, spinAxis, spinRate }
  }, [
    props.count, props.planes, props.radiusMin, props.radiusMax,
    props.speedMin, props.speedMax, props.sizeMin, props.sizeMax,
  ])

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  // Per-instance hue, set once / when colour params change; also cached for the shedding fade.
  useEffect(() => {
    const mesh = meshRef.current
    const rng = mulberry32(SEED + 1)
    const colors = new Float32Array(props.count * 3)
    const color = new THREE.Color()
    for (let i = 0; i < props.count; i++) {
      // Most particles are steel-blue; a minority take a blue-violet hue for variety.
      const purple = rng() < props.purpleFraction
      const hueDegrees = purple
        ? THREE.MathUtils.lerp(props.purpleHueMin, props.purpleHueMax, rng())
        : THREE.MathUtils.lerp(props.hueMin, props.hueMax, rng())
      const lightness = THREE.MathUtils.lerp(props.lightnessMin, props.lightnessMax, rng())
      color.setHSL(hueDegrees / 360, props.saturation, lightness)
      color.toArray(colors, i * 3)
      mesh.setColorAt(i, color)
    }
    baseColors.current = colors
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    invalidate() // paint the new colours even under frameloop 'demand'
  }, [
    props.count, props.hueMin, props.hueMax, props.purpleFraction, props.purpleHueMin,
    props.purpleHueMax, props.saturation, props.lightnessMin, props.lightnessMax,
  ])

  // Global brightness gain (material.color multiplies each instance colour) -> HDR for bloom.
  useEffect(() => {
    material.color.setScalar(props.brightness)
    invalidate()
  }, [material, props.brightness, invalidate])

  useFrame((state) => {
    const { driftProgress, reducedMotion, supernovaAt, orbStarted, orbStartAt, phase: orbPhase } = useScrollStore.getState()
    // Shedding only happens during the upward phases; gate by phase so a stale driftProgress (left
    // non-zero by a scroll jump / restore) can't shed the hero orb's particles before it's revealed.
    const drift = orbPhase === 'about' || orbPhase === 'past' ? driftProgress : 0
    // Click-to-reveal: before activation every particle is hidden (scale 0); after, they pop in ONE BY
    // ONE (staggered by index) once the core has started forming. Instant under reduced motion.
    const revealElapsed = orbStarted ? (performance.now() - orbStartAt) / 1000 : 0
    // Under reduced motion the particles hold their positions (frozen orbit). drift stays 0 anyway
    // (choreography is off under reduced motion), so there's no shedding either (docs/01).
    const time = reducedMotion ? 0 : state.clock.elapsedTime
    const mesh = meshRef.current
    const shedding = drift > SHED.startFraction
    // "67" supernova: the orb detonates - each particle is flung along its own random 3D trajectory
    // (shrapnel), tumbling and swelling, then streams back. Off under reduced motion.
    const novaElapsed = (performance.now() - supernovaAt) / 1000
    const nova = reducedMotion ? 0 : supernovaEnvelope(novaElapsed)
    const burst = nova * SUPERNOVA.burstDistance
    const exploding = burst > 0.0001

    for (let i = 0; i < props.count; i++) {
      const angle = phase[i] + speed[i] * time
      dummy.position.set(Math.cos(angle) * radius[i], Math.sin(angle) * radius[i], 0)
      dummy.position.applyMatrix4(planeMatrices[plane[i]])

      let fade = 1
      if (drift > releaseAt[i]) {
        const release = Math.min((drift - releaseAt[i]) / (1 - releaseAt[i]), 1)
        outward.copy(dummy.position).normalize()
        dummy.position.addScaledVector(outward, SHED.outward * release)
        dummy.position.y += SHED.lift * release
        fade = 1 - release
      }

      // Blast each piece outward along its own direction/speed and tumble it; identity otherwise.
      if (exploding) {
        const reach = burst * explodeSpeed[i]
        dummy.position.x += explodeDir[i * 3] * reach
        dummy.position.y += explodeDir[i * 3 + 1] * reach
        dummy.position.z += explodeDir[i * 3 + 2] * reach
        spinVec.set(spinAxis[i * 3], spinAxis[i * 3 + 1], spinAxis[i * 3 + 2])
        dummy.quaternion.setFromAxisAngle(spinVec, spinRate[i] * novaElapsed)
      } else {
        dummy.quaternion.identity()
      }

      let pReveal = 0
      if (orbStarted) {
        pReveal = reducedMotion
          ? 1
          : THREE.MathUtils.clamp(
              (revealElapsed - ORB_REVEAL.particleStart - i * ORB_REVEAL.particleStagger) / ORB_REVEAL.particleFade,
              0,
              1,
            )
      }
      dummy.scale.setScalar(size[i] * (1 + nova * (SUPERNOVA.pieceGrowth - 1)) * pReveal)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      if (shedding) {
        scratchColor.fromArray(baseColors.current, i * 3).multiplyScalar(fade)
        mesh.setColorAt(i, scratchColor)
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    if (shedding) {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      wasShedding.current = true
    } else if (wasShedding.current) {
      // Restore full colours once when scrolling back up out of the shed range.
      for (let i = 0; i < props.count; i++) {
        scratchColor.fromArray(baseColors.current, i * 3)
        mesh.setColorAt(i, scratchColor)
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      wasShedding.current = false
    }
  })

  return <instancedMesh ref={meshRef} args={[geometry, material, props.count]} />
}
