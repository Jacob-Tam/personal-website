import { lazy, Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import { useControls } from '../../lib/devControls'
import * as THREE from 'three'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Orb, type OrbProps } from './Orb'
import { OrbParticles, type ParticleProps } from './OrbParticles'
import { useOrbChoreography } from './useOrbChoreography'
import { ProjectsScene } from './ProjectsScene'
import type { JourneyLook } from '../../lib/projectsJourney'
import { useScrollStore } from '../../store/useScrollStore'
import { setInterludePin, setProjectsPin } from '../../lib/lenis'
import { BLOOM, CAMERA, CHOREOGRAPHY, CORE, CURSOR, FOG, LIGHTS, PARTICLES, PROJECTS_JOURNEY, VIGNETTE } from '../../lib/constants'

const isDev = import.meta.env.DEV

// DEV-only: lazy-load the leva panel so leva (its only other static entry point) is dynamically
// imported and therefore dropped from the production bundle.
const DevPanel = isDev ? lazy(() => import('./DevPanel').then((m) => ({ default: m.DevPanel }))) : null

type CursorTuning = { lerp: number; clampX: number; clampY: number }
type ChoreographyTuning = {
  interludeRadius: number
  driftDistance: number
  positionLerp: number
  pulseAmount: number
  rotationStill: number
}

// Core + particles as one group, driven each frame by the scroll choreography (docs/05).
function OrbSystem({
  core,
  particles,
  cursor,
  choreo,
}: {
  core: Omit<OrbProps, 'segments'>
  particles: ParticleProps
  cursor: CursorTuning
  choreo: ChoreographyTuning
}) {
  const groupRef = useRef<THREE.Group>(null!)
  useOrbChoreography(groupRef, cursor, choreo)
  return (
    <group ref={groupRef}>
      <Orb {...core} segments={CORE.segments} />
      <OrbParticles {...particles} />
    </group>
  )
}

// Owns the default camera position every frame: the static orb spot when idle, and the journey path
// (a gentle forward dolly + vertical drift, looking straight down -Z so the planet blocking is
// predictable) while the Projects pin is engaged. Always mounted, so it also RESTORES the orb camera
// after the journey - otherwise the camera would stay parked wherever the journey left it.
function CameraRig({
  orbDistance,
  journey,
}: {
  orbDistance: number
  journey: { camZ: number; camZTravel: number; camYDrift: number }
}) {
  const camera = useThree((state) => state.camera)
  useFrame(() => {
    const { projectsActive, projectsProgress } = useScrollStore.getState()
    if (projectsActive) {
      const z = journey.camZ - journey.camZTravel * projectsProgress
      const y = journey.camYDrift * (0.5 - projectsProgress)
      camera.position.set(0, y, z)
      camera.lookAt(0, y, z - 1)
    } else {
      camera.position.set(0, 0, orbDistance)
      camera.lookAt(0, 0, 0)
    }
  })
  return null
}

/*
  The single persistent <Canvas>, fixed behind all content (z-0) and non-interactive. The orb
  lives here for its whole lifecycle. Once it has fully drifted off the top (phase 'past') the
  frameloop is set to 'never' to stop rendering for Projects/Contact; it resumes if the user
  scrolls back up into About. leva + r3f-perf are DEV only.
*/
export function Scene() {
  const phase = useScrollStore((state) => state.phase)
  const reducedMotion = useScrollStore((state) => state.reducedMotion)
  const projectsActive = useScrollStore((state) => state.projectsActive)

  const camera = useControls('camera', {
    fov: { value: CAMERA.fov, min: 35, max: 75, step: 1 },
    distance: { value: CAMERA.position[2], min: 3, max: 10, step: 0.1 },
  }, { collapsed: true })

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
  }, { collapsed: true })

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
  }, { collapsed: true })

  const depth = useControls('depth (fog)', {
    fogNear: { value: FOG.near, min: 0, max: 8, step: 0.1 },
    fogFar: { value: FOG.far, min: 4, max: 16, step: 0.1 },
  }, { collapsed: true })

  const lights = useControls('lights', {
    ambient: { value: LIGHTS.ambient, min: 0, max: 1, step: 0.01 },
    pointIntensity: { value: LIGHTS.pointIntensity, min: 0, max: 6, step: 0.1 },
  }, { collapsed: true })

  const bloom = useControls('bloom', {
    intensity: { value: BLOOM.intensity, min: 0, max: 2, step: 0.01 },
    luminanceThreshold: { value: BLOOM.luminanceThreshold, min: 0, max: 1, step: 0.01 },
    luminanceSmoothing: { value: BLOOM.luminanceSmoothing, min: 0, max: 1, step: 0.01 },
    radius: { value: BLOOM.radius, min: 0, max: 1, step: 0.01 },
  }, { collapsed: true })

  const vignette = useControls('vignette', {
    enabled: VIGNETTE.enabled,
    darkness: { value: VIGNETTE.darkness, min: 0, max: 1, step: 0.01 },
    offset: { value: VIGNETTE.offset, min: 0, max: 1, step: 0.01 },
  }, { collapsed: true })

  const cursor = useControls('cursor', {
    lerp: { value: CURSOR.lerp, min: 0.01, max: 0.2, step: 0.005 },
    clampX: { value: CURSOR.clampX, min: 0, max: 3, step: 0.05 },
    clampY: { value: CURSOR.clampY, min: 0, max: 3, step: 0.05 },
  }, { collapsed: true })

  const choreography = useControls('choreography', {
    interludeRadius: { value: CHOREOGRAPHY.interludeRadius, min: 0.5, max: 4, step: 0.05 },
    driftDistance: { value: CHOREOGRAPHY.driftDistance, min: 3, max: 14, step: 0.5 },
    positionLerp: { value: CHOREOGRAPHY.positionLerp, min: 0.02, max: 0.2, step: 0.005 },
    pulseAmount: { value: CHOREOGRAPHY.pulseAmount, min: 0, max: 0.5, step: 0.01 },
    rotationStill: { value: CHOREOGRAPHY.rotationStill, min: 0, max: 1, step: 0.05 },
    pinVh: { value: CHOREOGRAPHY.interludePinVh, min: 0, max: 2, step: 0.05 },
  }, { collapsed: true })

  // DEV-only tuning for the Projects journey: the planet enter/arrive/exit world-path, the arrive
  // recede+dim, the gentle camera dolly, and the pin length. Timing/pacing is in PROJECTS_JOURNEY
  // (shared with the DOM panels). Bake whatever lands here back into PROJECTS_JOURNEY by hand.
  const projects = useControls('projects', {
    pinVh: { value: PROJECTS_JOURNEY.pinVh, min: 1, max: 8, step: 0.25 },
    rotationSpeed: { value: PROJECTS_JOURNEY.rotationSpeed, min: 0, max: 0.5, step: 0.01 },
    camZ: { value: PROJECTS_JOURNEY.camZ, min: 4, max: 12, step: 0.1 },
    camZTravel: { value: PROJECTS_JOURNEY.camZTravel, min: 0, max: 5, step: 0.1 },
    camYDrift: { value: PROJECTS_JOURNEY.camYDrift, min: 0, max: 2, step: 0.05 },
    enterX: { value: PROJECTS_JOURNEY.enter[0], min: 0, max: 9, step: 0.1 },
    enterZ: { value: PROJECTS_JOURNEY.enter[2], min: -16, max: -2, step: 0.1 },
    arriveX: { value: PROJECTS_JOURNEY.arrive[0], min: -2, max: 6, step: 0.1 },
    arriveY: { value: PROJECTS_JOURNEY.arrive[1], min: -3, max: 3, step: 0.1 },
    arriveZ: { value: PROJECTS_JOURNEY.arrive[2], min: -9, max: -1, step: 0.1 },
    exitX: { value: PROJECTS_JOURNEY.exit[0], min: -14, max: 0, step: 0.1 },
    exitZ: { value: PROJECTS_JOURNEY.exit[2], min: -12, max: 0, step: 0.1 },
    dim: { value: PROJECTS_JOURNEY.dim, min: 0, max: 1, step: 0.02 },
    recede: PROJECTS_JOURNEY.recede,
  }, { collapsed: true })

  const journeyLook: JourneyLook = {
    enter: [projects.enterX, PROJECTS_JOURNEY.enter[1], projects.enterZ],
    arrive: [projects.arriveX, projects.arriveY, projects.arriveZ],
    exit: [projects.exitX, PROJECTS_JOURNEY.exit[1], projects.exitZ],
    dim: projects.dim,
    recede: projects.recede,
  }

  // Live-tune the interlude pin length; setInterludePin re-refreshes ScrollTrigger.
  useEffect(() => {
    setInterludePin(choreography.pinVh)
  }, [choreography.pinVh])

  // Live-tune the Projects journey pin length.
  useEffect(() => {
    setProjectsPin(projects.pinVh)
  }, [projects.pinVh])

  return (
    <>
      {/* DEV-only orb controls: draggable + height-capped + scrollable (see DevPanel). */}
      {isDev && DevPanel && (
        <Suspense fallback={null}>
          <DevPanel />
        </Suspense>
      )}
      <div
        id="orb-canvas-layer"
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-700"
      >
        <Canvas
          // 'always' while something animates (orb in range, or the Projects journey is active);
          // otherwise 'demand' - which renders one settling frame on the scene-graph change (so the
          // parked planet is cleared when the journey ends, no stale frame) then idles at ~0 GPU.
          // 'demand' (not 'never') because 'never' retains the last frame: the planet does not drift
          // off-screen like the orb, so 'never' would freeze it over Contact. Reduced motion: static
          // orb, also 'demand'.
          frameloop={!reducedMotion && (projectsActive || phase !== 'past') ? 'always' : 'demand'}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
          onCreated={() => useScrollStore.getState().setCanvasReady(true)}
        >
          {isDev && <Perf position="bottom-right" />}
          <PerspectiveCamera makeDefault fov={camera.fov} position={[0, 0, camera.distance]} />
          <CameraRig
            orbDistance={camera.distance}
            journey={{ camZ: projects.camZ, camZTravel: projects.camZTravel, camYDrift: projects.camYDrift }}
          />
          {/* No fog during the Projects journey - the planets live in deep space, not the orb's fog. */}
          {!projectsActive && <fog attach="fog" args={[FOG.color, depth.fogNear, depth.fogFar]} />}
          <ambientLight intensity={lights.ambient} />
          <pointLight position={[0, 0, 0]} intensity={lights.pointIntensity} decay={2} color="#ffffff" />
          {/* Orb for hero/interlude/about; swapped out for the planets during the Projects pin. */}
          {!projectsActive && (
            <OrbSystem core={core} particles={particles} cursor={cursor} choreo={choreography} />
          )}
          {projectsActive && <ProjectsScene look={journeyLook} rotationSpeed={projects.rotationSpeed} />}
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
