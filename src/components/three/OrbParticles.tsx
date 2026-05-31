import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SEED } from '../../lib/constants'

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
  ~50 particles orbiting the core on a few distinct tilted planes (stylized Bohr atom), drawn
  as ONE instanced mesh. Each particle has a fixed plane, orbit radius, angular speed (mixed
  directions), phase, and size. Each frame we advance the angle, place the point on its tilted
  plane, and write the instance matrix (delta-independent: position is a pure function of
  elapsed time, so it is frame-rate independent). Depth is sold by scene fog dimming distant
  particles. Colors are per-instance hue; a global brightness gain on the material pushes them
  into HDR so the Step 4 bloom pass makes them glow.
*/
export function OrbParticles(props: ParticleProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const { plane, radius, speed, phase, size, planeMatrices } = useMemo(() => {
    const rng = mulberry32(SEED)
    const planeMatrices: THREE.Matrix4[] = []
    for (let p = 0; p < props.planes; p++) {
      const euler = new THREE.Euler(
        (rng() - 0.5) * Math.PI, // tilt out of the screen plane
        (p / props.planes) * Math.PI + (rng() - 0.5) * 0.6, // spread the planes around
        (rng() - 0.5) * Math.PI,
      )
      planeMatrices.push(new THREE.Matrix4().makeRotationFromEuler(euler))
    }

    const plane = new Int32Array(props.count)
    const radius = new Float32Array(props.count)
    const speed = new Float32Array(props.count)
    const phase = new Float32Array(props.count)
    const size = new Float32Array(props.count)
    for (let i = 0; i < props.count; i++) {
      plane[i] = i % Math.max(1, props.planes)
      radius[i] = THREE.MathUtils.lerp(props.radiusMin, props.radiusMax, rng())
      const magnitude = THREE.MathUtils.lerp(props.speedMin, props.speedMax, rng())
      speed[i] = rng() < 0.5 ? -magnitude : magnitude
      phase[i] = rng() * Math.PI * 2
      size[i] = THREE.MathUtils.lerp(props.sizeMin, props.sizeMax, rng())
    }
    return { plane, radius, speed, phase, size, planeMatrices }
  }, [
    props.count, props.planes, props.radiusMin, props.radiusMax,
    props.speedMin, props.speedMax, props.sizeMin, props.sizeMax,
  ])

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  // Per-instance hue (0..1 range), set once / when color params change.
  useEffect(() => {
    const mesh = meshRef.current
    const rng = mulberry32(SEED + 1)
    const color = new THREE.Color()
    for (let i = 0; i < props.count; i++) {
      const hue = THREE.MathUtils.lerp(props.hueMin, props.hueMax, rng()) / 360
      const lightness = THREE.MathUtils.lerp(props.lightnessMin, props.lightnessMax, rng())
      color.setHSL(hue, props.saturation, lightness)
      mesh.setColorAt(i, color)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [props.count, props.hueMin, props.hueMax, props.saturation, props.lightnessMin, props.lightnessMax])

  // Global brightness gain (material.color multiplies each instance color) -> HDR for bloom.
  useEffect(() => {
    material.color.setScalar(props.brightness)
  }, [material, props.brightness])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const mesh = meshRef.current
    for (let i = 0; i < props.count; i++) {
      const angle = phase[i] + speed[i] * time
      dummy.position.set(Math.cos(angle) * radius[i], Math.sin(angle) * radius[i], 0)
      dummy.position.applyMatrix4(planeMatrices[plane[i]])
      dummy.scale.setScalar(size[i])
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={meshRef} args={[geometry, material, props.count]} />
}
