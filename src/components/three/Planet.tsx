import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type PlanetProps = {
  color: string
  radius: number
  position: [number, number, number]
  rotationSpeed: number // rad/s self-rotation
}

/*
  A single Projects-journey planet: a modest shaded sphere (lit by ProjectsScene's directional light
  so it reads with a terminator) that gently self-rotates. Real Three.js object in the main canvas -
  a SEPARATE system from the ambient CSS shared/Planets.tsx. Surface variation/atmosphere comes in a
  later step; for now it's a clean shaded sphere (placeholder look, the choreography is the priority).
*/
export function Planet({ color, radius, position, rotationSpeed }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    meshRef.current.rotation.y += delta * rotationSpeed
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 48, 32]} />
      <meshStandardMaterial color={color} roughness={0.9} metalness={0} />
    </mesh>
  )
}
