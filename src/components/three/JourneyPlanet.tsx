import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { planetMotion, type JourneyLook } from '../../lib/projectsJourney'

/*
  One planet in the Projects journey: a shaded sphere (lit by ProjectsScene's directional light so it
  reads with a terminator) that flies the enter -> arrive -> exit path for its beat. Position, fade,
  and the arrive recede+dim are all derived per frame from projectsProgress via planetMotion()
  (getState, no reactive subscription). Real Three.js object - a SEPARATE system from the ambient CSS
  shared/Planets.tsx (no shared geometry, no orb connection). Brightness multiplies the base colour, so
  dimming also pulls the planet below the bloom threshold as it settles into the backdrop.
*/
export function JourneyPlanet({
  index,
  color,
  radius,
  rotationSpeed,
  look,
}: {
  index: number
  color: string
  radius: number
  rotationSpeed: number
  look: JourneyLook
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!)
  const base = useMemo(() => new THREE.Color(color), [color])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    const motion = planetMotion(useScrollStore.getState().projectsProgress, index, look)

    mesh.visible = motion.visible
    if (!motion.visible) return

    mesh.position.set(motion.position[0], motion.position[1], motion.position[2])
    mesh.rotation.y += delta * rotationSpeed
    materialRef.current.opacity = motion.opacity
    materialRef.current.color.copy(base).multiplyScalar(motion.brightness)
  })

  return (
    <mesh ref={meshRef} visible={false}>
      <sphereGeometry args={[radius, 48, 32]} />
      {/* fog={false}: the planets ignore the orb's scene fog (which we keep mounted the whole time so
          it never toggles), so they read correctly in deep space whatever the camera distance. */}
      <meshStandardMaterial ref={materialRef} color={color} roughness={0.9} metalness={0} transparent opacity={0} fog={false} />
    </mesh>
  )
}
