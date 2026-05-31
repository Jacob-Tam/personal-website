import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
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
    const time = state.clock.elapsedTime
    const u = material.uniforms
    u.uTime.value = time
    u.uEmissive.value = props.emissive
    u.uNoiseAmp.value = props.noiseAmp
    u.uNoiseScale.value = props.noiseScale
    u.uNoiseSpeed.value = props.noiseSpeed
    u.uFresnelPower.value = props.fresnelPower
    ;(u.uCoreColor.value as THREE.Color).set(props.coreColor)
    ;(u.uRimColor.value as THREE.Color).set(props.rimColor)

    // Slow breathing: a small sinusoidal scale around 1 (docs/04).
    const breathe = 1 + props.pulseAmplitude * Math.sin((time * Math.PI * 2) / props.pulsePeriod)
    meshRef.current.scale.setScalar(breathe)
  })

  return <mesh ref={meshRef} geometry={geometry} material={material} />
}
