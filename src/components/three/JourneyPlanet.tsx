import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { planetMotion, type JourneyLook } from '../../lib/projectsJourney'
import { makePlanetSurface } from '../../lib/planetTexture'
import { PROJECTS_JOURNEY } from '../../lib/constants'

const S = PROJECTS_JOURNEY.surface

// Value-noise fbm for the vertex displacement (object space, so the lumps rotate with the planet).
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
  Patches MeshStandardMaterial (onBeforeCompile) so the planet is not a perfect sphere:
  - VERTEX: displaces each vertex along its normal by fbm (object space) -> an uneven silhouette +
    relief; the normal is recomputed from two displaced tangent neighbours so the lumps catch light.
  - FRAGMENT: a fresnel limb (cheap atmosphere) on the lit edge, riding on diffuseColor so it dims with
    the planet at arrive.
  Surface COLOUR + fine bump come from the baked texture maps (lib/planetTexture), not the shader.
*/
function patchPlanetMaterial(material: THREE.MeshStandardMaterial, seed: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimStrength = { value: S.rimStrength }
    shader.uniforms.uRimPower = { value: S.rimPower }
    shader.uniforms.uDispScale = { value: S.dispScale }
    shader.uniforms.uDispAmp = { value: S.dispAmp }
    shader.uniforms.uSeed = { value: seed }

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
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
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n        transformed = plDisplaced;')

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n        uniform float uRimStrength, uRimPower;')
      .replace(
        '#include <normal_fragment_begin>',
        /* glsl */ `#include <normal_fragment_begin>
        float planetRim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), uRimPower);
        diffuseColor.rgb *= 1.0 + planetRim * uRimStrength;`,
      )
  }
}

/*
  One planet in the Projects journey: a displaced, textured sphere (lit by ProjectsScene's directional
  light) that flies the enter -> arrive -> exit path for its beat. Position, fade, and the arrive
  recede+dim are derived per frame from projectsProgress via planetMotion() (getState, no reactive
  subscription). The colour map carries the hue, so dimming multiplies material.color (a grey scalar)
  to darken it below the bloom threshold at arrive. Real Three.js object - a SEPARATE system from the
  ambient CSS shared/Planets.tsx.
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
  // Per-planet baked maps + a per-planet noise seed for the displacement. Stable across renders.
  const surface = useMemo(() => makePlanetSurface(color, index * 17.3), [color, index])
  const onBeforeCompile = useMemo(
    () => (material: THREE.MeshStandardMaterial) => patchPlanetMaterial(material, index * 13.7),
    [index],
  )
  useEffect(() => () => {
    surface.map.dispose()
    surface.bump.dispose()
  }, [surface])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    const motion = planetMotion(useScrollStore.getState().projectsProgress, index, look)

    mesh.visible = motion.visible
    if (!motion.visible) return

    mesh.position.set(motion.position[0], motion.position[1], motion.position[2])
    mesh.rotation.y += delta * rotationSpeed
    materialRef.current.opacity = motion.opacity
    materialRef.current.color.setScalar(motion.brightness) // map carries the hue; this only dims
  })

  return (
    <mesh ref={meshRef} visible={false}>
      {/* 64x48 so the displacement reads as smooth lumps, not facets. */}
      <sphereGeometry args={[radius, 64, 48]} />
      {/* Texture maps (lib/planetTexture) carry colour + fine bump; onBeforeCompile adds the big
          displacement + the fresnel limb. fog={false}: the planets ignore the orb's scene fog. */}
      <meshStandardMaterial
        ref={materialRef}
        map={surface.map}
        bumpMap={surface.bump}
        bumpScale={S.bumpScale}
        roughness={0.92}
        metalness={0}
        transparent
        opacity={0}
        fog={false}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  )
}
