import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { BELTS, beltDrift, beltFade, makeAsteroids, wrapX } from '../../lib/interludeBelts'

/*
  The interlude asteroid belts: two horizontal rows of simple low-poly rocks drifting sideways in
  opposite directions, which the orb weaves through as it descends (the weaving itself is in
  useOrbChoreography - this just renders + drifts the rocks from the SAME shared model, so they line up
  with the gaps the orb steers to). One InstancedMesh, matrices rewritten each frame; opacity fades in/out
  across the interlude. Visible only during the interlude phase (and not under reduced motion); on
  low-power there's no canvas at all. Lives in world space (z ~ 0), the orb's plane.
*/

// Seeded points on the unit sphere = crater centres (stable across reloads). Each is a vec4: xyz = the
// centre direction, w = cos(angular radius). The shader carves a shaded bowl wherever the surface
// direction falls inside one. Shared across instances (per-instance rotation makes them read differently).
const CRATER_COUNT = 14
function makeCraters() {
  let seed = 70241
  const rand = () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return Array.from({ length: CRATER_COUNT }, () => {
    const u = rand() * 2 - 1
    const theta = rand() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    const radius = 0.16 + rand() * 0.22 // small angular radius (radians)
    return new THREE.Vector4(s * Math.cos(theta), s * Math.sin(theta), u, Math.cos(radius))
  })
}

export function InterludeBelts() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const asteroids = useMemo(() => makeAsteroids(), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []) // low-poly faceted "rock"
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: BELTS.color,
      emissive: new THREE.Color(BELTS.emissive),
      roughness: 1,
      metalness: 0,
      flatShading: true, // faceted, reads as rock rather than a smooth ball
      transparent: true, // for the interlude fade in/out
      opacity: 0,
      fog: false, // they sit deep in the fog range; keep them crisp like the planets do
    })
    // CRATERS (via onBeforeCompile): object-space bowls carved into the shading normal (+ a slightly
    // darker floor) wherever the surface direction falls inside a seeded crater. No UVs/seams; works on
    // the faceted surface.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uCraters = { value: makeCraters() }
      shader.uniforms.uCraterDepth = { value: 0.7 } // how strongly the bowl tilts the normal
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;\nvarying mat3 vNormalXf;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vObjPos = position;
          // object-space normal/vector -> view space (same transform the engine uses for instanced
          // normals); constant per instance, so it interpolates trivially. The fragment needs it because
          // normalMatrix/instanceMatrix are vertex-only.
          vNormalXf = normalMatrix * mat3(instanceMatrix);`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vObjPos;
          varying mat3 vNormalXf;
          uniform vec4 uCraters[${CRATER_COUNT}];
          uniform float uCraterDepth;`,
        )
        // Carve the craters into the lighting normal. For each crater the fragment is inside, tilt the
        // normal toward the crater centre on the walls (a bowl), strongest mid-wall (sin profile).
        .replace(
          '#include <normal_fragment_begin>',
          /* glsl */ `#include <normal_fragment_begin>
          {
            vec3 dirObj = normalize(vObjPos);
            vec3 tilt = vec3(0.0);
            for (int i = 0; i < ${CRATER_COUNT}; i++) {
              vec4 cr = uCraters[i];
              float t = dot(dirObj, cr.xyz);
              if (t > cr.w) {
                float r = (1.0 - t) / (1.0 - cr.w);        // 0 centre .. 1 edge
                vec3 outward = normalize(dirObj - cr.xyz * t + 1e-5);
                tilt += outward * sin(r * 3.14159265);     // wall slope
              }
            }
            normal = normalize(normal - vNormalXf * tilt * uCraterDepth); // toward centre -> depression
          }`,
        )
        // Darken the crater floors a touch so the bowls read even in flat light.
        .replace(
          '#include <map_fragment>',
          /* glsl */ `#include <map_fragment>
          {
            vec3 dirObj = normalize(vObjPos);
            float floorShade = 0.0;
            for (int i = 0; i < ${CRATER_COUNT}; i++) {
              vec4 cr = uCraters[i];
              float t = dot(dirObj, cr.xyz);
              if (t > cr.w) {
                float r = (1.0 - t) / (1.0 - cr.w);
                floorShade = max(floorShade, 1.0 - r);     // deepest at the centre
              }
            }
            diffuseColor.rgb *= 1.0 - 0.28 * floorShade;
          }`,
        )
    }
    return mat
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    const mesh = meshRef.current
    const { phase, interludeProgress, reducedMotion } = useScrollStore.getState()
    const visible = !reducedMotion && phase === 'interlude'
    mesh.visible = visible
    if (!visible) return

    const time = state.clock.elapsedTime
    material.opacity = beltFade(interludeProgress)

    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i]
      dummy.position.set(wrapX(a.baseX + beltDrift(a.belt, time)), a.y, a.z)
      dummy.rotation.set(
        a.rot[0] + time * a.rotRate[0],
        a.rot[1] + time * a.rotRate[1],
        a.rot[2] + time * a.rotRate[2],
      )
      dummy.scale.setScalar(a.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, asteroids.length]}
      frustumCulled={false} // instances move; the static bounds would cull them incorrectly
      visible={false}
    />
  )
}
