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
    // Blue fresnel RIM (the site's single accent), echoing the orb's rim so the belts feel part of the
    // same world. A smooth, instance-rotated sphere normal drives the fresnel, so the silhouette glows
    // cleanly even though the surface is faceted. Added to emissive -> reads as a cool edge light.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRim = { value: new THREE.Color('#6bb0dc') } // --color-accent-hi
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRimNormal;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvRimNormal = normalize(normalMatrix * (mat3(instanceMatrix) * normalize(position)));',
        )
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRimNormal;\nuniform vec3 uRim;')
        .replace(
          '#include <emissivemap_fragment>',
          /* glsl */ `#include <emissivemap_fragment>
          {
            // High power = a THIN crisp edge (a refined blue outline), not a wide glow that turns the
            // rocks into blue bubbles. Kept low-intensity: the accent should whisper, not shout.
            float rkFres = pow(1.0 - clamp(dot(normalize(vRimNormal), normalize(vViewPosition)), 0.0, 1.0), 4.5);
            totalEmissiveRadiance += uRim * rkFres * 0.5;
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
