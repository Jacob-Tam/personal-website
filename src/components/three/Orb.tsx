import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '../../store/useScrollStore'
import { SUPERNOVA, supernovaEnvelope } from '../../lib/supernova'
import { coreFragmentShader, coreVertexShader } from './coreShader'

export type OrbProps = {
  radius: number
  segments: number
  emissive: number
  pulseAmplitude: number
  pulsePeriod: number
  noiseAmp: number
  noiseScale: number
  noiseSpeed: number
  fresnelPower: number
  coreColor: string
  rimColor: string
}

export function Orb(props: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: coreVertexShader,
        fragmentShader: coreFragmentShader,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uEmissive: { value: props.emissive },
          uNoiseAmp: { value: props.noiseAmp },
          uNoiseScale: { value: props.noiseScale },
          uNoiseSpeed: { value: props.noiseSpeed },
          uFresnelPower: { value: props.fresnelPower },
          uCoreColor: { value: new THREE.Color(props.coreColor) },
          uRimColor: { value: new THREE.Color(props.rimColor) },
        },
      }),
    // Created once; all uniforms are updated live in useFrame below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const geometry = useMemo(
    () => new THREE.SphereGeometry(props.radius, props.segments, props.segments),
    [props.radius, props.segments],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    const { reducedMotion, supernovaAt } = useScrollStore.getState()
    const u = material.uniforms
    // "67" supernova: a bright emissive flash + scale swell that eases back. Off under reduced
    // motion, where the core also holds still (uTime + breathing frozen, docs/01).
    const nova = reducedMotion ? 0 : supernovaEnvelope((performance.now() - supernovaAt) / 1000)
    if (!reducedMotion) u.uTime.value = state.clock.elapsedTime
    u.uEmissive.value = props.emissive + nova * SUPERNOVA.flashEmissive
    u.uNoiseAmp.value = props.noiseAmp
    u.uNoiseScale.value = props.noiseScale
    u.uNoiseSpeed.value = props.noiseSpeed
    u.uFresnelPower.value = props.fresnelPower
    ;(u.uCoreColor.value as THREE.Color).set(props.coreColor)
    ;(u.uRimColor.value as THREE.Color).set(props.rimColor)

    // Slow breathing: a small sinusoidal scale around 1 (docs/04). Held at 1 under reduced motion.
    const breathe = reducedMotion
      ? 1
      : 1 + props.pulseAmplitude * Math.sin((state.clock.elapsedTime * Math.PI * 2) / props.pulsePeriod)
    // "67" supernova: the core COLLAPSES to a point at the peak (it blows apart into the shards) then
    // reforms as they stream back. A scale dip is used (not the emissive flash, which the bloom/tone-
    // mapping pipeline swallows) so the detonation reads reliably.
    const novaScale = Math.max(0.06, 1 - nova * SUPERNOVA.coreCollapse)
    meshRef.current.scale.setScalar(breathe * novaScale)
  })

  return <mesh ref={meshRef} geometry={geometry} material={material} />
}
