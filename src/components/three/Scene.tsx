import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import { Leva, useControls } from 'leva'
import * as THREE from 'three'
import { Orb, type OrbProps } from './Orb'
import { OrbParticles, type ParticleProps } from './OrbParticles'
import { CAMERA, CORE, FOG, GROUP, LIGHTS, PARTICLES } from '../../lib/constants'

const isDev = import.meta.env.DEV

// Core + particles as one group, slowly rotating overall (docs/04). useFrame must run inside
// the Canvas, so this lives in its own component. Scroll choreography (Step 8) drives this
// group's position later; for now it only idle-spins.
function OrbSystem({ core, particles }: { core: Omit<OrbProps, 'segments'>; particles: ParticleProps }) {
  const groupRef = useRef<THREE.Group>(null!)
  useFrame((_, delta) => {
    groupRef.current.rotation.y += delta * GROUP.idleSpinY
  })
  return (
    <group ref={groupRef}>
      <Orb {...core} segments={CORE.segments} />
      <OrbParticles {...particles} />
    </group>
  )
}

/*
  The single persistent <Canvas>, fixed behind all content (z-0) and non-interactive so it
  never eats clicks. The orb lives here for its whole lifecycle. leva panels and r3f-perf are
  DEV only. Tuned values get baked into lib/constants.ts. No scroll/cursor wiring yet (Step 5/8).
*/
export function Scene() {
  const camera = useControls('camera', {
    fov: { value: CAMERA.fov, min: 35, max: 75, step: 1 },
    distance: { value: CAMERA.position[2], min: 3, max: 10, step: 0.1 },
  })

  const core = useControls('core', {
    radius: { value: CORE.radius, min: 0.1, max: 1, step: 0.01 },
    emissive: { value: CORE.emissive, min: 0, max: 3, step: 0.05 },
    pulseAmplitude: { value: CORE.pulseAmplitude, min: 0, max: 0.1, step: 0.005 },
    pulsePeriod: { value: CORE.pulsePeriod, min: 1, max: 8, step: 0.1 },
    noiseAmp: { value: CORE.noiseAmp, min: 0, max: 0.6, step: 0.01 },
    noiseScale: { value: CORE.noiseScale, min: 0.2, max: 5, step: 0.1 },
    noiseSpeed: { value: CORE.noiseSpeed, min: 0, max: 1.5, step: 0.01 },
    fresnelPower: { value: CORE.fresnelPower, min: 0.5, max: 6, step: 0.1 },
    coreColor: CORE.coreColor,
    rimColor: CORE.rimColor,
  })

  const particles = useControls('particles', {
    count: { value: PARTICLES.count, min: 0, max: 120, step: 1 },
    planes: { value: PARTICLES.planes, min: 1, max: 6, step: 1 },
    radiusMin: { value: PARTICLES.radiusMin, min: 0.5, max: 3, step: 0.05 },
    radiusMax: { value: PARTICLES.radiusMax, min: 0.5, max: 4, step: 0.05 },
    speedMin: { value: PARTICLES.speedMin, min: 0, max: 1, step: 0.01 },
    speedMax: { value: PARTICLES.speedMax, min: 0, max: 1.5, step: 0.01 },
    sizeMin: { value: PARTICLES.sizeMin, min: 0.005, max: 0.06, step: 0.001 },
    sizeMax: { value: PARTICLES.sizeMax, min: 0.005, max: 0.1, step: 0.001 },
    hueMin: { value: PARTICLES.hueMin, min: 180, max: 260, step: 1 },
    hueMax: { value: PARTICLES.hueMax, min: 180, max: 260, step: 1 },
    saturation: { value: PARTICLES.saturation, min: 0, max: 1, step: 0.01 },
    lightnessMin: { value: PARTICLES.lightnessMin, min: 0, max: 1, step: 0.01 },
    lightnessMax: { value: PARTICLES.lightnessMax, min: 0, max: 1, step: 0.01 },
    brightness: { value: PARTICLES.brightness, min: 0.5, max: 3, step: 0.05 },
  })

  const depth = useControls('depth (fog)', {
    fogNear: { value: FOG.near, min: 0, max: 8, step: 0.1 },
    fogFar: { value: FOG.far, min: 4, max: 16, step: 0.1 },
  })

  const lights = useControls('lights', {
    ambient: { value: LIGHTS.ambient, min: 0, max: 1, step: 0.01 },
    pointIntensity: { value: LIGHTS.pointIntensity, min: 0, max: 6, step: 0.1 },
  })

  return (
    <>
      {isDev && <Leva collapsed />}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Canvas gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
          {isDev && <Perf position="bottom-right" />}
          <PerspectiveCamera makeDefault fov={camera.fov} position={[0, 0, camera.distance]} />
          <fog attach="fog" args={[FOG.color, depth.fogNear, depth.fogFar]} />
          <ambientLight intensity={lights.ambient} />
          <pointLight position={[0, 0, 0]} intensity={lights.pointIntensity} decay={2} color="#ffffff" />
          <OrbSystem core={core} particles={particles} />
        </Canvas>
      </div>
    </>
  )
}
