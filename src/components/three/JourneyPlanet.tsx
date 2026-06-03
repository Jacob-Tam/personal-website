import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { planetMotion, type JourneyLook } from '../../lib/projectsJourney'
import { PROJECTS_JOURNEY } from '../../lib/constants'

const S = PROJECTS_JOURNEY.surface

// Shared value-noise fbm (used by both stages: vertex for displacement, fragment for mottling).
const NOISE_GLSL = /* glsl */ `
  float pHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float pNoise(vec3 x){
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(pHash(i + vec3(0,0,0)), pHash(i + vec3(1,0,0)), f.x),
                   mix(pHash(i + vec3(0,1,0)), pHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(pHash(i + vec3(0,0,1)), pHash(i + vec3(1,0,1)), f.x),
                   mix(pHash(i + vec3(0,1,1)), pHash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float pFbm(vec3 p){ float v = 0.0, a = 0.5; for (int k = 0; k < 4; k++){ v += a * pNoise(p); p *= 2.0; a *= 0.5; } return v; }
`

/*
  Patches MeshStandardMaterial (onBeforeCompile) so a planet is NOT a perfect sphere:
  - Vertex: displaces each vertex along its normal by fbm (object space, so it rotates with the
    planet), giving an uneven silhouette + surface relief. The normal is recomputed from two displaced
    tangent neighbours (finite differences) so the bumps actually catch the light.
  - Fragment: fbm brightness mottling + a fresnel limb. Both ride on diffuseColor, so they dim with the
    planet at arrive.
  No textures, no extra draw calls; all planets share one program (identical GLSL), a per-planet uSeed
  offsets the noise so they differ.
*/
function patchPlanetMaterial(material: THREE.MeshStandardMaterial, seed: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNoiseScale = { value: S.noiseScale }
    shader.uniforms.uNoiseStrength = { value: S.noiseStrength }
    shader.uniforms.uRimStrength = { value: S.rimStrength }
    shader.uniforms.uRimPower = { value: S.rimPower }
    shader.uniforms.uDispScale = { value: S.dispScale }
    shader.uniforms.uDispAmp = { value: S.dispAmp }
    shader.uniforms.uSeed = { value: seed }

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vObjPos;
        uniform float uDispScale, uDispAmp, uSeed;
        ${NOISE_GLSL}
        float pDisp(vec3 p){ return (pFbm(p * uDispScale + uSeed) - 0.5) * uDispAmp; }`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `#include <beginnormal_vertex>
        float plR = length(position);
        vec3 plN = plR > 1e-4 ? position / plR : objectNormal;
        vec3 plRef = abs(plN.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 plT = normalize(cross(plN, plRef));
        vec3 plB = cross(plN, plT);
        float plE = 0.06;
        vec3 plPA = normalize(position + plT * plE) * plR;
        vec3 plPB = normalize(position + plB * plE) * plR;
        vec3 plQ0 = position + plN * pDisp(position);
        vec3 plQA = plPA + normalize(plPA) * pDisp(plPA);
        vec3 plQB = plPB + normalize(plPB) * pDisp(plPB);
        objectNormal = normalize(cross(plQA - plQ0, plQB - plQ0));
        if (dot(objectNormal, plN) < 0.0) objectNormal = -objectNormal;
        vec3 plDisplaced = plQ0;`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        transformed = plDisplaced;
        vObjPos = position;`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vObjPos;
        uniform float uNoiseScale, uNoiseStrength, uRimStrength, uRimPower, uSeed;
        ${NOISE_GLSL}`,
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
  One planet in the Projects journey: a displaced/shaded sphere (lit by ProjectsScene's directional
  light) that flies the enter -> arrive -> exit path for its beat. Position, fade, and the arrive
  recede+dim are derived per frame from projectsProgress via planetMotion() (getState, no reactive
  subscription). Surface relief + mottling come from patchPlanetMaterial. Real Three.js object - a
  SEPARATE system from the ambient CSS shared/Planets.tsx. Brightness multiplies the base colour, so
  dimming also pulls it below the bloom threshold as it settles into the backdrop.
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
      {/* 64x48 so the noise displacement reads as smooth lumps, not facets. */}
      <sphereGeometry args={[radius, 64, 48]} />
      {/* fog={false}: the planets ignore the orb's scene fog (which we keep mounted the whole time so
          it never toggles). onBeforeCompile adds the displacement + surface noise + limb. */}
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
