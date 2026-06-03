import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { planetMotion, type JourneyLook } from '../../lib/projectsJourney'
import { PROJECTS_JOURNEY } from '../../lib/constants'

const S = PROJECTS_JOURNEY.surface

// Value-noise fbm + a fresnel limb injected into MeshStandardMaterial. The noise is sampled in
// OBJECT space (vObjPos = the geometry's local position) so the mottling is painted on the surface
// and rotates with the planet; the fresnel brightens the lit limb (a cheap atmosphere) and rides on
// diffuseColor, so it dims along with the planet at arrive. No textures, no extra draw calls.
function patchPlanetMaterial(material: THREE.MeshStandardMaterial, seed: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNoiseScale = { value: S.noiseScale }
    shader.uniforms.uNoiseStrength = { value: S.noiseStrength }
    shader.uniforms.uRimStrength = { value: S.rimStrength }
    shader.uniforms.uRimPower = { value: S.rimPower }
    shader.uniforms.uSeed = { value: seed }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vObjPos = position;')

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vObjPos;
        uniform float uNoiseScale, uNoiseStrength, uRimStrength, uRimPower, uSeed;
        float pHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float pNoise(vec3 x){
          vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(pHash(i + vec3(0,0,0)), pHash(i + vec3(1,0,0)), f.x),
                         mix(pHash(i + vec3(0,1,0)), pHash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(pHash(i + vec3(0,0,1)), pHash(i + vec3(1,0,1)), f.x),
                         mix(pHash(i + vec3(0,1,1)), pHash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        float pFbm(vec3 p){ float v = 0.0, a = 0.5; for (int k = 0; k < 4; k++){ v += a * pNoise(p); p *= 2.0; a *= 0.5; } return v; }`,
      )
      .replace(
        '#include <normal_fragment_begin>',
        /* glsl */ `#include <normal_fragment_begin>
        float planetN = pFbm(vObjPos * uNoiseScale + uSeed);
        diffuseColor.rgb *= 1.0 + (planetN - 0.5) * uNoiseStrength;
        float planetRim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), uRimPower);
        diffuseColor.rgb *= 1.0 + planetRim * uRimStrength;`,
      )
  }
}

/*
  One planet in the Projects journey: a shaded sphere (lit by ProjectsScene's directional light so it
  reads with a terminator) that flies the enter -> arrive -> exit path for its beat. Position, fade,
  and the arrive recede+dim are all derived per frame from projectsProgress via planetMotion()
  (getState, no reactive subscription). Surface variation (noise + limb) comes from
  patchPlanetMaterial. Real Three.js object - a SEPARATE system from the ambient CSS
  shared/Planets.tsx. Brightness multiplies the base colour, so dimming also pulls it below the bloom
  threshold as it settles into the backdrop.
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
  // Per-planet noise offset so the four don't share an identical surface; stable across renders.
  const onBeforeCompile = useMemo(
    () => (material: THREE.MeshStandardMaterial) => patchPlanetMaterial(material, index * 13.7),
    [index],
  )

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
          it never toggles), so they read correctly in deep space whatever the camera distance.
          onBeforeCompile adds the surface noise + limb (see patchPlanetMaterial). */}
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        roughness={0.9}
        metalness={0}
        transparent
        opacity={0}
        fog={false}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  )
}
