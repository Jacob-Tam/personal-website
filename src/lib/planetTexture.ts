import * as THREE from 'three'

/*
  Bakes procedural planet textures (a colour map + a bump map) so the journey planets carry real
  texture maps, not just shader shading. The noise is sampled at the 3D point on the sphere's surface
  for each (longitude, latitude) texel, so the equirectangular map is SEAMLESS at the longitude wrap
  and clean at the poles (no canvas-noise seam or pole-pinch). Two tones of the planet's own hue
  blended by low-frequency noise read as continents/marbling; a higher-frequency layer adds fine
  detail and drives the bump map. Self-contained - no external image assets, stays on-palette.
*/

const W = 256
const H = 128

// Fast integer spatial hash (no Math.sin) -> 0..1. Generation runs once at load, but keep it cheap.
function hash3(ix: number, iy: number, iz: number): number {
  let n = (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791)) >>> 0
  n = (n ^ (n >>> 13)) >>> 0
  n = Math.imul(n, 1274126177) >>> 0
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

const smooth = (t: number) => t * t * (3 - 2 * t)
const mix = (a: number, b: number, t: number) => a + (b - a) * t

function valueNoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const u = smooth(x - xi)
  const v = smooth(y - yi)
  const w = smooth(z - zi)
  return mix(
    mix(
      mix(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u),
      mix(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u),
      v,
    ),
    mix(
      mix(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u),
      mix(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u),
      v,
    ),
    w,
  )
}

function fbm(x: number, y: number, z: number, octaves: number): number {
  let value = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    value += amp * valueNoise(x * freq, y * freq, z * freq)
    freq *= 2
    amp *= 0.5
  }
  return value
}

export type PlanetSurface = { map: THREE.DataTexture; bump: THREE.DataTexture }

export function makePlanetSurface(baseHex: string, seed: number): PlanetSurface {
  const base = new THREE.Color(baseHex)
  const hsl = { h: 0, s: 0, l: 0 }
  base.getHSL(hsl)
  // A darker, slightly hue-shifted second tone for the "low" regions - keeps it in the planet's family.
  const dark = new THREE.Color().setHSL((hsl.h + 0.03) % 1, Math.min(1, hsl.s * 1.05), hsl.l * 0.38)

  const colorBytes = new Uint8Array(W * H * 4)
  const bumpBytes = new Uint8Array(W * H * 4)
  const c = new THREE.Color()
  const regionFreq = 2.3
  const detailFreq = 6.5

  for (let y = 0; y < H; y++) {
    const lat = ((y + 0.5) / H) * Math.PI
    const sinLat = Math.sin(lat)
    const py = Math.cos(lat)
    for (let x = 0; x < W; x++) {
      const lon = ((x + 0.5) / W) * Math.PI * 2
      const px = sinLat * Math.cos(lon)
      const pz = sinLat * Math.sin(lon)

      const region = smooth(
        THREE.MathUtils.clamp((fbm(px * regionFreq + seed, py * regionFreq + seed, pz * regionFreq + seed, 5) - 0.28) / 0.5, 0, 1),
      )
      const detail = fbm(px * detailFreq + seed * 2, py * detailFreq + seed * 2, pz * detailFreq + seed * 2, 4)

      c.copy(dark).lerp(base, region).multiplyScalar(0.8 + 0.25 * detail)
      c.convertLinearToSRGB() // map is decoded sRGB->linear in the shader; round-trips to the intended colour

      const i = (y * W + x) * 4
      colorBytes[i] = c.r * 255
      colorBytes[i + 1] = c.g * 255
      colorBytes[i + 2] = c.b * 255
      colorBytes[i + 3] = 255

      const height = Math.round((0.45 * region + 0.55 * detail) * 255)
      bumpBytes[i] = height
      bumpBytes[i + 1] = height
      bumpBytes[i + 2] = height
      bumpBytes[i + 3] = 255
    }
  }

  const map = new THREE.DataTexture(colorBytes, W, H, THREE.RGBAFormat)
  map.colorSpace = THREE.SRGBColorSpace
  configure(map)
  const bump = new THREE.DataTexture(bumpBytes, W, H, THREE.RGBAFormat)
  configure(bump)
  return { map, bump }
}

// Seamless in longitude (RepeatWrapping on S), clamped at the poles, mipmapped for clean minification.
function configure(texture: THREE.DataTexture) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.needsUpdate = true
}
