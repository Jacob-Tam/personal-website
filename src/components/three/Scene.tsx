import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import { Leva, useControls } from 'leva'
import { Orb } from './Orb'
import { CAMERA, CORE, LIGHTS } from '../../lib/constants'

const isDev = import.meta.env.DEV

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
          <ambientLight intensity={lights.ambient} />
          <pointLight position={[0, 0, 0]} intensity={lights.pointIntensity} decay={2} color="#ffffff" />
          <Orb {...core} segments={CORE.segments} />
        </Canvas>
      </div>
    </>
  )
}
