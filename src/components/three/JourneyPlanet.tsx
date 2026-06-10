import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { planetMotion, type JourneyLook } from '../../lib/projectsJourney'
import { makePlanetSurface } from '../../lib/planetTexture'
import { PROJECTS_JOURNEY, type PlanetConfig, type PlanetRing } from '../../lib/constants'

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
  Patches the ring's MeshBasicMaterial so a flat RingGeometry annulus reads as a banded, dust-thin
  Saturn ring: the radial coordinate (length of the local XY position) drives an alpha that fades at
  both edges, ripples into fine bands, and carries one darker Cassini-style gap. No texture asset.
*/
function patchRingMaterial(material: THREE.MeshBasicMaterial, ring: PlanetRing, radius: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uInner = { value: radius * ring.inner }
    shader.uniforms.uOuter = { value: radius * ring.outer }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n        varying float vRingR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n        vRingR = length(position.xy);')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n        varying float vRingR;\n        uniform float uInner, uOuter;')
      .replace(
        '#include <map_fragment>',
        /* glsl */ `#include <map_fragment>
        float rt = clamp((vRingR - uInner) / (uOuter - uInner), 0.0, 1.0);
        // Feather the inner + outer edges into dust.
        float edge = smoothstep(0.0, 0.06, rt) * (1.0 - smoothstep(0.94, 1.0, rt));
        // A handful of distinct concentric bands (kept LOW frequency so they actually read at this
        // on-screen size instead of aliasing to a flat tone); two incommensurate sines + a per-band
        // brightness jitter give it irregular Saturn-ring texture rather than one regular ripple.
        float fine = mix(0.5 + 0.5 * sin(rt * 23.0), 0.5 + 0.5 * sin(rt * 9.0 + 1.7), 0.5);
        float bandId = floor(rt * 15.0);
        float jitter = fract(sin(bandId * 78.233) * 43758.5453);
        float bands = mix(0.25, 1.0, fine) * mix(0.55, 1.2, jitter);
        // Major structure: a dimmer inner ring, a sharp Cassini gap, a fainter outer gap.
        float innerFade = mix(0.5, 1.0, smoothstep(0.0, 0.26, rt));
        float cassini = 1.0 - 0.92 * exp(-pow((rt - 0.5) / 0.025, 2.0));
        float outerGap = 1.0 - 0.5 * exp(-pow((rt - 0.78) / 0.025, 2.0));
        float profile = edge * innerFade * cassini * outerGap;
        // Drive BRIGHTNESS (clear light/dark bands), not just alpha, so the ring has real texture.
        diffuseColor.rgb *= 0.4 + 0.9 * bands;
        diffuseColor.a *= profile * (0.4 + 0.6 * bands);`,
      )
  }
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
  const ringOnBeforeCompile = useMemo(
    () => (ring ? (material: THREE.MeshBasicMaterial) => patchRingMaterial(material, ring, planet.radius) : undefined),
    [ring, planet.radius],
  )
  // Ring hue is held separately so per-frame dimming can multiply it down without losing the colour.
  const ringBase = useMemo(() => (ring ? new THREE.Color(ring.color) : null), [ring])

  useEffect(() => () => {
    surface.map.dispose()
    surface.bump.dispose()
  }, [surface])

  useFrame((_, delta) => {
    const group = groupRef.current
    const motion = planetMotion(useScrollStore.getState().projectsProgress, index, look)

    group.visible = motion.visible
    if (!motion.visible) return

    group.position.set(motion.position[0], motion.position[1], motion.position[2])
    meshRef.current.rotation.y += delta * rotationSpeed
    materialRef.current.opacity = motion.opacity
    materialRef.current.color.setScalar(motion.brightness) // map carries the hue; this only dims
    if (ringMatRef.current && ringBase && ring) {
      ringMatRef.current.opacity = motion.opacity * ring.opacity
      ringMatRef.current.color.copy(ringBase).multiplyScalar(motion.brightness)
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
      {ring && (
        // Tilted ring. renderOrder after the sphere + depthWrite off so the sphere's depth occludes the
        // far half while the near half blends over it (correct Saturn layering). depthTest stays on.
        <mesh rotation={[ring.tilt[0], 0, ring.tilt[1]]} renderOrder={2}>
          <ringGeometry args={[planet.radius * ring.inner, planet.radius * ring.outer, 128]} />
          <meshBasicMaterial
            ref={ringMatRef}
            color={ring.color}
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
            fog={false}
            onBeforeCompile={ringOnBeforeCompile}
          />
        </mesh>
      )}
    </group>
  )
}
