import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { planetMotion, type JourneyLook } from '../../lib/projectsJourney'
import { makePlanetSurface, makeRingTexture } from '../../lib/planetTexture'
import { PROJECTS_JOURNEY, type PlanetConfig } from '../../lib/constants'

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
  Per-planet `dispAmp`/`rim*` (constants) make a smooth gas giant vs. a rugged rocky moon from one
  shader. Surface COLOUR + fine bump come from the baked texture maps (lib/planetTexture).
*/
function patchPlanetMaterial(material: THREE.MeshStandardMaterial, seed: number, planet: PlanetConfig) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimStrength = { value: planet.rimStrength ?? S.rimStrength }
    shader.uniforms.uRimPower = { value: planet.rimPower ?? S.rimPower }
    shader.uniforms.uDispScale = { value: planet.dispScale ?? S.dispScale }
    shader.uniforms.uDispAmp = { value: planet.dispAmp ?? S.dispAmp }
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
  A flat ring annulus whose UVs are rebuilt RADIALLY: u runs 0 (inner edge) -> 1 (outer edge), so the
  baked 1D radial strip (lib/planetTexture makeRingTexture) maps to concentric bands. RingGeometry's
  default UVs are square-planar, which would smear the strip across the ring; recomputing them per
  vertex from the radius is what makes the band texture land correctly.
*/
function makeRingGeometry(inner: number, outer: number): THREE.RingGeometry {
  const geometry = new THREE.RingGeometry(inner, outer, 180, 1)
  const position = geometry.attributes.position
  const uv = geometry.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < position.count; i++) {
    const radius = Math.hypot(position.getX(i), position.getY(i))
    uv.setXY(i, (radius - inner) / (outer - inner), 0.5)
  }
  uv.needsUpdate = true
  return geometry
}

/*
  One planet in the Projects journey: a displaced, textured sphere (lit by ProjectsScene's directional
  light) plus, on some planets, a tilted ring. Position, fade, and the arrive recede+dim are derived
  per frame from projectsProgress via planetMotion() (getState, no reactive subscription). The colour
  map carries the hue, so dimming multiplies material.color (a grey scalar) to darken it below the bloom
  threshold at arrive. The group carries the position/visibility; the sphere alone takes the spin so the
  ring keeps a fixed tilt (a ring co-rotating on the planet's axis would flip face-on/edge-on). Real
  Three.js objects - a SEPARATE system from the ambient CSS shared/Planets.tsx.
*/
export function JourneyPlanet({
  index,
  planet,
  rotationSpeed,
  look,
}: {
  index: number
  planet: PlanetConfig
  rotationSpeed: number
  look: JourneyLook
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!)
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null)

  // Per-planet baked maps (hue + fine bump for this archetype) + per-planet seeds. Stable across renders.
  const surface = useMemo(() => makePlanetSurface(planet.color, index * 17.3, planet.style), [planet.color, planet.style, index])
  const onBeforeCompile = useMemo(
    () => (material: THREE.MeshStandardMaterial) => patchPlanetMaterial(material, index * 13.7, planet),
    [index, planet],
  )
  const ring = planet.ring
  // Baked radial band strip + a ring annulus with radial UVs, so the bands actually map on. The map
  // carries the ring's hue + bands; material.color stays a grey scalar used only for the per-frame dim.
  const ringTexture = useMemo(() => (ring ? makeRingTexture(ring.color) : null), [ring])
  const ringGeometry = useMemo(
    () => (ring ? makeRingGeometry(planet.radius * ring.inner, planet.radius * ring.outer) : null),
    [ring, planet.radius],
  )

  useEffect(() => () => {
    surface.map.dispose()
    surface.bump.dispose()
    ringTexture?.dispose()
    ringGeometry?.dispose()
  }, [surface, ringTexture, ringGeometry])

  useFrame((_, delta) => {
    const group = groupRef.current
    const motion = planetMotion(useScrollStore.getState().projectsProgress, index, look)

    group.visible = motion.visible
    if (!motion.visible) return

    group.position.set(motion.position[0], motion.position[1], motion.position[2])
    meshRef.current.rotation.y += delta * rotationSpeed
    materialRef.current.opacity = motion.opacity
    materialRef.current.color.setScalar(motion.brightness) // map carries the hue; this only dims
    if (ringMatRef.current && ring) {
      ringMatRef.current.opacity = motion.opacity * ring.opacity
      ringMatRef.current.color.setScalar(motion.brightness) // map carries the hue + bands; this only dims
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      <mesh ref={meshRef}>
        {/* 64x48 so the displacement reads as smooth lumps, not facets. */}
        <sphereGeometry args={[planet.radius, 64, 48]} />
        {/* Texture maps (lib/planetTexture) carry colour + fine bump; onBeforeCompile adds the big
            displacement + the fresnel limb. fog={false}: the planets ignore the orb's scene fog. */}
        <meshStandardMaterial
          ref={materialRef}
          map={surface.map}
          bumpMap={surface.bump}
          bumpScale={planet.bumpScale ?? S.bumpScale}
          roughness={planet.roughness ?? 0.92}
          metalness={0}
          transparent
          opacity={0}
          fog={false}
          onBeforeCompile={onBeforeCompile}
        />
      </mesh>
      {ring && ringGeometry && ringTexture && (
        // Tilted ring. renderOrder after the sphere + depthWrite off so the sphere's depth occludes the
        // far half while the near half blends over it (correct Saturn layering). depthTest stays on.
        // The baked radial strip (map) carries the band colour + alpha; material.color is the dim scalar.
        <mesh geometry={ringGeometry} rotation={[ring.tilt[0], 0, ring.tilt[1]]} renderOrder={2}>
          <meshBasicMaterial
            ref={ringMatRef}
            map={ringTexture}
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
            fog={false}
          />
        </mesh>
      )}
    </group>
  )
}
