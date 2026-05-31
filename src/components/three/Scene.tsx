import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import { Leva, useControls } from 'leva'
import * as THREE from 'three'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Orb, type OrbProps } from './Orb'
import { OrbParticles, type ParticleProps } from './OrbParticles'
import { useOrbChoreography } from './useOrbChoreography'
import { useScrollStore } from '../../store/useScrollStore'
import { BLOOM, CAMERA, CORE, CURSOR, FOG, LIGHTS, PARTICLES, VIGNETTE } from '../../lib/constants'

const isDev = import.meta.env.DEV

type CursorTuning = { lerp: number; clampX: number; clampY: number }

// Core + particles as one group, driven each frame by the scroll choreography (docs/05).
function OrbSystem({
  core,
  particles,
  cursor,
}: {
  core: Omit<OrbProps, 'segments'>
  particles: ParticleProps
  cursor: CursorTuning
}) {
  const groupRef = useRef<THREE.Group>(null!)
  useOrbChoreography(groupRef, cursor)
  return (
    <group ref={groupRef}>
      <Orb {...core} segments={CORE.segments} />
      <OrbParticles {...particles} />
    </group>
  )
}

/*
  The single persistent <Canvas>, fixed behind all content (z-0) and non-interactive. The orb
  lives here for its whole lifecycle. Once it has fully drifted off the top (phase 'past') the
  frameloop is set to 'never' to stop rendering for Projects/Contact; it resumes if the user
  scrolls back up into About. leva + r3f-perf are DEV only.
*/
export function Scene() {
  const phase = useScrollStore((state) => state.phase)

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
    hueMin: { value: PARTICLES.hueMin, min: 180, max: 300, step: 1 },
    hueMax: { value: PARTICLES.hueMax, min: 180, max: 300, step: 1 },
    purpleFraction: { value: PARTICLES.purpleFraction, min: 0, max: 1, step: 0.05 },
    purpleHueMin: { value: PARTICLES.purpleHueMin, min: 240, max: 300, step: 1 },
    purpleHueMax: { value: PARTICLES.purpleHueMax, min: 240, max: 300, step: 1 },
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

  const bloom = useControls('bloom', {
    intensity: { value: BLOOM.intensity, min: 0, max: 2, step: 0.01 },
    luminanceThreshold: { value: BLOOM.luminanceThreshold, min: 0, max: 1, step: 0.01 },
    luminanceSmoothing: { value: BLOOM.luminanceSmoothing, min: 0, max: 1, step: 0.01 },
    radius: { value: BLOOM.radius, min: 0, max: 1, step: 0.01 },
  })

  const vignette = useControls('vignette', {
    enabled: VIGNETTE.enabled,
    darkness: { value: VIGNETTE.darkness, min: 0, max: 1, step: 0.01 },
    offset: { value: VIGNETTE.offset, min: 0, max: 1, step: 0.01 },
  })

  const cursor = useControls('cursor', {
    lerp: { value: CURSOR.lerp, min: 0.01, max: 0.2, step: 0.005 },
    clampX: { value: CURSOR.clampX, min: 0, max: 3, step: 0.05 },
    clampY: { value: CURSOR.clampY, min: 0, max: 3, step: 0.05 },
  })

  return (
    <>
      {/* DEV-only orb controls, anchored top-center so they clear the nav links + social icons. */}
      {isDev && (
        <div className="pointer-events-none fixed left-1/2 top-2 z-50 w-80 -translate-x-1/2">
          <div className="pointer-events-auto">
            <Leva fill flat collapsed titleBar={{ drag: false, title: 'orb controls' }} />
          </div>
        </div>
      )}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Canvas
          frameloop={phase === 'past' ? 'never' : 'always'}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
        >
          {isDev && <Perf position="bottom-right" />}
          <PerspectiveCamera makeDefault fov={camera.fov} position={[0, 0, camera.distance]} />
          <fog attach="fog" args={[FOG.color, depth.fogNear, depth.fogFar]} />
          <ambientLight intensity={lights.ambient} />
          <pointLight position={[0, 0, 0]} intensity={lights.pointIntensity} decay={2} color="#ffffff" />
          <OrbSystem core={core} particles={particles} cursor={cursor} />
          <EffectComposer multisampling={4} frameBufferType={THREE.HalfFloatType}>
            <Bloom
              intensity={bloom.intensity}
              luminanceThreshold={bloom.luminanceThreshold}
              luminanceSmoothing={bloom.luminanceSmoothing}
              radius={bloom.radius}
              mipmapBlur
            />
            <Vignette darkness={vignette.enabled ? vignette.darkness : 0} offset={vignette.offset} eskil={false} />
          </EffectComposer>
        </Canvas>
      </div>
    </>
  )
}
