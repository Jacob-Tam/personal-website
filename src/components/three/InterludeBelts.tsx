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

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []) // 20-face low-poly "rock"; craters are shaded in (no extra geometry needed)
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
    // Surface detail (via onBeforeCompile), all object-space so there are no UVs/seams:
    //  - CRATERS: bowls carved into the shading normal (+ darker floors) at seeded points.
    //  - GRAIN: subtle fine value-noise roughening of the normal, so the flat low-poly faces read as
    //    textured stone instead of clean facets. Kept low so it stays a hint, not a makeover.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uCraters = { value: makeCraters() }
      shader.uniforms.uCraterDepth = { value: 0.7 } // how strongly the bowl tilts the normal
      shader.uniforms.uGrain = { value: 0.25 } // subtle surface grain strength
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
          uniform float uCraterDepth;
          uniform float uGrain;
          float rkHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
          float rkVN(vec3 x){
            vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(rkHash(i + vec3(0.0,0.0,0.0)), rkHash(i + vec3(1.0,0.0,0.0)), f.x),
                           mix(rkHash(i + vec3(0.0,1.0,0.0)), rkHash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
                       mix(mix(rkHash(i + vec3(0.0,0.0,1.0)), rkHash(i + vec3(1.0,0.0,1.0)), f.x),
                           mix(rkHash(i + vec3(0.0,1.0,1.0)), rkHash(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z);
          }`,
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
            // fine surface grain: tilt the normal by the tangent gradient of a high-freq value noise so
            // the flat faces read as stone. Object-space, projected to the surface tangent plane.
            vec3 gp = vObjPos * 13.0;
            float g0 = rkVN(gp);
            vec3 grain = vec3(
              rkVN(gp + vec3(0.5, 0.0, 0.0)) - g0,
              rkVN(gp + vec3(0.0, 0.5, 0.0)) - g0,
              rkVN(gp + vec3(0.0, 0.0, 0.5)) - g0
            );
            grain -= dot(grain, dirObj) * dirObj;
            normal = normalize(normal - vNormalXf * (tilt * uCraterDepth + grain * uGrain));
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

    // Subtle scroll-linked depth drift: the field eases from slightly nearer (start) to slightly farther
    // (end) as you scroll through, giving a gentle sense of passing through the belt. z only - it doesn't
    // touch the x-gaps the orb threads, so the weave is unaffected.
    const zDrift = (0.5 - interludeProgress) * 1.2

    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i]
      dummy.position.set(wrapX(a.baseX + beltDrift(a.belt, time)), a.y, a.z + zDrift)
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
