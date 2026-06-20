import { lazy, Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Preload } from '@react-three/drei'
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
import { setProjectsPin } from '../../lib/lenis'
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
  // Reduced motion runs the canvas on 'demand'; nudge a render when the orb is activated so its
  // (instant) reveal actually paints. On the animated path the 'always' loop already covers it.
  const invalidate = useThree((state) => state.invalidate)
  const orbStarted = useScrollStore((state) => state.orbStarted)
  useEffect(() => {
    if (orbStarted) invalidate()
  }, [orbStarted, invalidate])
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

  // DEV-only orb tuning, trimmed to ~9 knobs worth touching live; everything else is baked in
  // lib/constants (the panel was overwhelming with ~50 orb controls).
  const orb = useControls('orb', {
    distance: { value: CAMERA.position[2], min: 3, max: 10, step: 0.1 },
    particleCount: { value: PARTICLES.count, min: 0, max: 120, step: 1 },
    particleBrightness: { value: PARTICLES.brightness, min: 0.5, max: 3, step: 0.05 },
    purpleFraction: { value: PARTICLES.purpleFraction, min: 0, max: 1, step: 0.05 },
    coreColor: CORE.coreColor,
    rimColor: CORE.rimColor,
    coreEmissive: { value: CORE.emissive, min: 0, max: 3, step: 0.05 },
    coreRadius: { value: CORE.radius, min: 0.1, max: 1, step: 0.01 },
    bloomIntensity: { value: BLOOM.intensity, min: 0, max: 2, step: 0.01 },
  }, { collapsed: true })

  // The few live knobs above, mixed with the baked constants for everything else.
  const core = {
    radius: orb.coreRadius,
    emissive: orb.coreEmissive,
    pulseAmplitude: CORE.pulseAmplitude,
    pulsePeriod: CORE.pulsePeriod,
    noiseAmp: CORE.noiseAmp,
    noiseScale: CORE.noiseScale,
    noiseSpeed: CORE.noiseSpeed,
    fresnelPower: CORE.fresnelPower,
    coreColor: orb.coreColor,
    rimColor: orb.rimColor,
  }
  const particles = {
    count: orb.particleCount,
    planes: PARTICLES.planes,
    radiusMin: PARTICLES.radiusMin,
    radiusMax: PARTICLES.radiusMax,
    speedMin: PARTICLES.speedMin,
    speedMax: PARTICLES.speedMax,
    sizeMin: PARTICLES.sizeMin,
    sizeMax: PARTICLES.sizeMax,
    hueMin: PARTICLES.hueMin,
    hueMax: PARTICLES.hueMax,
    purpleFraction: orb.purpleFraction,
    purpleHueMin: PARTICLES.purpleHueMin,
    purpleHueMax: PARTICLES.purpleHueMax,
    saturation: PARTICLES.saturation,
    lightnessMin: PARTICLES.lightnessMin,
    lightnessMax: PARTICLES.lightnessMax,
    brightness: orb.particleBrightness,
  }
  const cursor = { lerp: CURSOR.lerp, clampX: CURSOR.clampX, clampY: CURSOR.clampY }
  const choreography = {
    interludeRadius: CHOREOGRAPHY.interludeRadius,
    driftDistance: CHOREOGRAPHY.driftDistance,
    positionLerp: CHOREOGRAPHY.positionLerp,
    pulseAmount: CHOREOGRAPHY.pulseAmount,
    rotationStill: CHOREOGRAPHY.rotationStill,
  }

  // DEV-only tuning for the Projects journey: the depth-led base path (enter/arrive/exit), the per-planet
  // lane spread, the arrive recede+dim, the streaming-star speed, and the pin length. Timing/pacing is in
  // PROJECTS_JOURNEY (shared with the DOM panels). Bake whatever lands here back into PROJECTS_JOURNEY.
  const projects = useControls('projects', {
    pinVh: { value: PROJECTS_JOURNEY.pinVh, min: 1, max: 8, step: 0.25 },
    rotationSpeed: { value: PROJECTS_JOURNEY.rotationSpeed, min: 0, max: 0.5, step: 0.01 },
    camZ: { value: PROJECTS_JOURNEY.camZ, min: 4, max: 12, step: 0.1 },
    enterZ: { value: PROJECTS_JOURNEY.enter[2], min: -60, max: -10, step: 0.5 }, // depth of the distant speck
    arriveX: { value: PROJECTS_JOURNEY.arrive[0], min: -4, max: 4, step: 0.1 }, // base lateral (lane adds the side)
    arriveY: { value: PROJECTS_JOURNEY.arrive[1], min: -3, max: 3, step: 0.1 },
    arriveZ: { value: PROJECTS_JOURNEY.arrive[2], min: -9, max: -2, step: 0.1 },
    exitZ: { value: PROJECTS_JOURNEY.exit[2], min: -4, max: 8, step: 0.1 }, // + = at/past the camera plane
    laneAmp: { value: PROJECTS_JOURNEY.laneAmp, min: 0, max: 8, step: 0.1 }, // constant lateral offset
    laneYScale: { value: PROJECTS_JOURNEY.laneYScale, min: 0, max: 1, step: 0.02 },
    starDrift: { value: PROJECTS_JOURNEY.stars.baseDrift, min: 0, max: 12, step: 0.1 }, // coast speed (reading)
    starBoost: { value: PROJECTS_JOURNEY.stars.boost, min: 0, max: 200, step: 5 }, // scroll velocity -> warp
    dim: { value: PROJECTS_JOURNEY.dim, min: 0, max: 1, step: 0.02 },
    recede: PROJECTS_JOURNEY.recede,
  }, { collapsed: true })

  // enter/exit base x and y stay centred (0); each planet's lane offset supplies the lateral spread.
  const journeyLook: JourneyLook = {
    enter: [0, 0, projects.enterZ],
    arrive: [projects.arriveX, projects.arriveY, projects.arriveZ],
    exit: [0, 0, projects.exitZ],
    dim: projects.dim,
    recede: projects.recede,
    laneAmp: projects.laneAmp,
    laneYScale: projects.laneYScale,
  }

  // Live-tune the Projects journey pin length. (The interlude pin uses CHOREOGRAPHY.interludePinVh.)
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
          <PerspectiveCamera makeDefault fov={CAMERA.fov} position={[0, 0, orb.distance]} />
          {/* Camera holds STATIC through the journey (the planets + streaming stars carry the motion, and
              the screen must not move vertically while you read). camZTravel/camYDrift stay baked at 0. */}
          <CameraRig
            orbDistance={orb.distance}
            journey={{ camZ: projects.camZ, camZTravel: PROJECTS_JOURNEY.camZTravel, camYDrift: PROJECTS_JOURNEY.camYDrift }}
          />
          {/* Fog stays mounted the whole time (the orb particles dim into it for depth); the planets
              opt OUT via material.fog=false. We never toggle scene.fog because adding/removing it
              recompiles every material mid-scroll - one cause of the About->Projects scroll lurch. */}
          <fog attach="fog" args={[FOG.color, FOG.near, FOG.far]} />
          <ambientLight intensity={LIGHTS.ambient} />
          <pointLight position={[0, 0, 0]} intensity={LIGHTS.pointIntensity} decay={2} color="#ffffff" />
          {/* Orb (hero/interlude/about) and the planets (Projects pin) are BOTH kept mounted and
              toggled by group VISIBILITY rather than mounted/unmounted: building the orb particles +
              4 planets (and changing the light count) on the single boundary frame made that frame
              long enough that Lenis lurched the scroll on the next tick. ProjectsScene's light stays
              on (the orb is unlit, so it's inert there) and its planets self-hide (opacity 0 outside
              the journey), so nothing mounts or recompiles at the seam. */}
          <group visible={!projectsActive}>
            <OrbSystem core={core} particles={particles} cursor={cursor} choreo={choreography} />
          </group>
          <ProjectsScene
            look={journeyLook}
            rotationSpeed={projects.rotationSpeed}
            active={projectsActive}
            camZ={projects.camZ}
            starDrift={projects.starDrift}
            starBoost={projects.starBoost}
          />
          {/* Precompile every material up front (incl. the hidden planets) so a shader doesn't compile
              the first frame a planet becomes visible at the About->Projects seam - that lazy compile
              was the last hitch lurching the scroll. */}
          <Preload all />
          <EffectComposer multisampling={4} frameBufferType={THREE.HalfFloatType}>
            <Bloom
              intensity={orb.bloomIntensity}
              luminanceThreshold={BLOOM.luminanceThreshold}
              luminanceSmoothing={BLOOM.luminanceSmoothing}
              radius={BLOOM.radius}
              mipmapBlur
            />
            <Vignette darkness={VIGNETTE.enabled ? VIGNETTE.darkness : 0} offset={VIGNETTE.offset} eskil={false} />
          </EffectComposer>
        </Canvas>
      </div>
    </>
  )
}
