import * as THREE from 'three'

/*
  Bakes procedural planet textures (a colour map + a bump map) so the journey planets carry real
  texture maps, not just shader shading. The noise is sampled at the 3D point on the sphere's surface
  for each (longitude, latitude) texel, so the equirectangular map is SEAMLESS at the longitude wrap
  and clean at the poles (no canvas-noise seam or pole-pinch). Self-contained - no external image
  assets, stays on-palette.

  Each planet picks a STYLE (archetype) so the four read as genuinely different worlds, not one planet
  recoloured four times:
    - 'terran' - two-tone continents/oceans + ragged polar ice caps
    - 'gas'    - domain-warped latitude bands + a single storm oval (gas giant); smooth, no relief
    - 'ice'    - pale low-saturation frost veined with sharp ridged cracks
    - 'rocky'  - desaturated mottled rock pocked with crater rims; strong relief
  All colour maths stays in LINEAR space (getHSL/setHSL default to the working space) and is converted
  to sRGB once per texel before it is written to the sRGB-tagged DataTexture.
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
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const smoothstep = (e0: number, e1: number, x: number) => smooth(clamp((x - e0) / (e1 - e0), 0, 1))
const TAU = Math.PI * 2
// Shortest signed angular difference, mapped to [-PI, PI] (for the seamless storm oval in longitude).
const wrapPi = (a: number) => a - TAU * Math.floor((a + Math.PI) / TAU)
const toByte = (v: number) => (v <= 0 ? 0 : v >= 1 ? 255 : (v * 255) | 0)

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

// Ridged noise: sharp 0..1 ridges (peaks ~1 along thin lines) - reads as cracks / crater rims.
function ridge(x: number, y: number, z: number, octaves: number): number {
  return 1 - Math.abs(2 * fbm(x, y, z, octaves) - 1)
}

export type PlanetStyle = 'terran' | 'gas' | 'ice' | 'rocky'
export type PlanetSurface = { map: THREE.DataTexture; bump: THREE.DataTexture }

export function makePlanetSurface(baseHex: string, seed: number, style: PlanetStyle = 'terran'): PlanetSurface {
  const base = new THREE.Color(baseHex)
  const hsl = { h: 0, s: 0, l: 0 }
  base.getHSL(hsl)

  const colorBytes = new Uint8Array(W * H * 4)
  const bumpBytes = new Uint8Array(W * H * 4)
  const c = new THREE.Color() // working colour
  const t1 = new THREE.Color() // scratch tone
  const t2 = new THREE.Color() // scratch tone

  // Gas-giant storm: a fixed point in (lat, lon) that the oval falloff is measured from.
  const stormLat = 1.95
  const stormLon = 1.7

  for (let y = 0; y < H; y++) {
    const lat = ((y + 0.5) / H) * Math.PI
    const sinLat = Math.sin(lat)
    const py = Math.cos(lat) // +1 at north pole, -1 at south pole
    for (let x = 0; x < W; x++) {
      const lon = ((x + 0.5) / W) * Math.PI * 2
      const px = sinLat * Math.cos(lon)
      const pz = sinLat * Math.sin(lon)

      let height: number // set by every style branch below

      if (style === 'gas') {
        // Latitude bands warped by low-freq noise so they wave; fine streaks ride along them.
        const warp = fbm(px * 1.2 + seed, py * 1.2 + seed, pz * 1.2 + seed, 4) - 0.5
        const streak = fbm(px * 5 + seed * 3, py * 9 + seed * 3, pz * 5 + seed * 3, 3) - 0.5
        const bands = 0.5 + 0.5 * Math.sin((py * 3.4 + warp * 1.6) * Math.PI)
        const band = clamp(bands * 0.82 + streak * 0.5 + 0.25, 0, 1)
        c.setHSL((hsl.h + 0.02) % 1, hsl.s, hsl.l * 0.5) // dark belt
        t1.setHSL(hsl.h, hsl.s * 0.6, Math.min(0.92, hsl.l * 1.7)) // light cream zone
        c.lerp(t1, band)
        // One storm oval (wider in longitude than latitude), seamless across the lon wrap.
        const dlat = lat - stormLat
        const dlon = wrapPi(lon - stormLon)
        const storm = Math.exp(-((dlon / 0.6) ** 2 + (dlat / 0.32) ** 2) * 1.4)
        t2.setHSL((hsl.h - 0.04 + 1) % 1, Math.min(1, hsl.s * 1.1), hsl.l * 0.78)
        c.lerp(t2, clamp(storm, 0, 1))
        height = 0.5 + 0.28 * (band - 0.5) // gentle; a gas giant has no hard relief
      } else if (style === 'ice') {
        const shade = fbm(px * 2.2 + seed, py * 2.2 + seed, pz * 2.2 + seed, 5)
        const detail = fbm(px * 6 + seed * 3, py * 6 + seed * 3, pz * 6 + seed * 3, 3)
        c.setHSL(hsl.h, hsl.s * 0.3, 0.72) // pale frost (low saturation, bright)
        t1.setHSL((hsl.h + 0.02) % 1, hsl.s * 0.22, 0.9)
        c.lerp(t1, smooth(shade)).multiplyScalar(0.92 + 0.12 * detail)
        // Sharp ridged fractures, kept thin and darker than the frost.
        const crack = smoothstep(0.8, 0.99, ridge(px * 4.2 + seed * 2, py * 4.2 + seed * 2, pz * 4.2 + seed * 2, 5))
        t2.setHSL((hsl.h - 0.02 + 1) % 1, hsl.s * 0.5, 0.3)
        c.lerp(t2, crack * 0.85)
        height = 0.6 * (1 - crack) + 0.4 * detail // cracks recess into grooves
      } else if (style === 'rocky') {
        const region = fbm(px * 3 + seed, py * 3 + seed, pz * 3 + seed, 5)
        const pit = fbm(px * 7 + seed * 4, py * 7 + seed * 4, pz * 7 + seed * 4, 4)
        const rims = ridge(px * 6.5 + seed * 9, py * 6.5 + seed * 9, pz * 6.5 + seed * 9, 3)
        c.setHSL((hsl.h + 0.02) % 1, hsl.s * 0.5, hsl.l * 0.5) // dark, desaturated rock
        t1.setHSL(hsl.h, hsl.s * 0.4, Math.min(0.85, hsl.l * 1.05))
        c.lerp(t1, smooth(region)).multiplyScalar(0.7 + 0.5 * pit)
        t2.setHSL((hsl.h + 0.02) % 1, hsl.s * 0.5, hsl.l * 0.32)
        c.lerp(t2, smoothstep(0.55, 0.92, rims) * 0.5) // shadowed crater rims
        height = 0.35 * region + 0.65 * pit
      } else {
        // 'terran': two-tone continents/oceans + ragged polar ice caps.
        const region = smooth(
          clamp((fbm(px * 2.3 + seed, py * 2.3 + seed, pz * 2.3 + seed, 5) - 0.3) / 0.5, 0, 1),
        )
        const detail = fbm(px * 6.5 + seed * 2, py * 6.5 + seed * 2, pz * 6.5 + seed * 2, 4)
        c.setHSL((hsl.h + 0.04) % 1, Math.min(1, hsl.s * 1.05), hsl.l * 0.34) // ocean
        t1.setHSL(hsl.h, hsl.s, hsl.l) // land
        c.lerp(t1, region).multiplyScalar(0.82 + 0.22 * detail)
        const cap = clamp(smoothstep(0.74, 0.92, Math.abs(py)) * (0.55 + 0.45 * detail), 0, 1)
        t2.setHSL(0.58, 0.12, 0.92) // cold near-white
        c.lerp(t2, cap)
        height = 0.5 * region + 0.4 * detail + 0.3 * cap
      }

      c.convertLinearToSRGB() // map is decoded sRGB->linear in the shader; round-trips to the intended colour
      const i = (y * W + x) * 4
      colorBytes[i] = toByte(c.r)
      colorBytes[i + 1] = toByte(c.g)
      colorBytes[i + 2] = toByte(c.b)
      colorBytes[i + 3] = 255

      const h8 = toByte(height)
      bumpBytes[i] = h8
      bumpBytes[i + 1] = h8
      bumpBytes[i + 2] = h8
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

/*
  Bakes a 1D RADIAL strip for a planet's ring (used as the ring material's `map`): width runs from the
  inner edge (u=0) to the outer edge (u=1). The ring geometry's UVs are rebuilt radially (JourneyPlanet)
  so this strip maps to concentric bands. Each band gets a distinct brightness + a touch of hue/sat
  shift (dark brown -> bright cream), with a soft inner fade, a sharp Cassini gap and a fainter outer
  gap baked into the ALPHA. Baking the bands as a real texture (instead of a procedural shader) is what
  finally makes the ring read as textured. RGB is sRGB-encoded; alpha is raw.
*/
export function makeRingTexture(baseHex: string): THREE.DataTexture {
  const RW = 512
  const RH = 4
  const base = new THREE.Color(baseHex)
  const hsl = { h: 0, s: 0, l: 0 }
  base.getHSL(hsl)

  const row = new Uint8Array(RW * 4)
  const c = new THREE.Color()
  const bandCount = 11

  for (let x = 0; x < RW; x++) {
    const t = (x + 0.5) / RW // 0 inner .. 1 outer
    const bi = Math.floor(t * bandCount)
    const rnd = hash3(bi, 7, 13) // distinct brightness per band
    const fine = 0.86 + 0.14 * Math.sin(t * 120) // subtle ripple within a band
    const bright = (0.32 + 0.68 * rnd) * fine

    // Dark bands lean brown/saturated; bright bands lean cream/desaturated.
    c.setHSL(hsl.h, clamp(hsl.s * (1.05 - 0.5 * bright), 0, 1), clamp(0.14 + 0.82 * bright, 0.08, 0.93))
    c.convertLinearToSRGB()

    const edge = smoothstep(0, 0.04, t) * (1 - smoothstep(0.96, 1, t))
    const cassini = 1 - 0.9 * Math.exp(-(((t - 0.5) / 0.025) ** 2))
    const outerGap = 1 - 0.55 * Math.exp(-(((t - 0.8) / 0.02) ** 2))
    const innerDim = mix(0.5, 1, smoothstep(0, 0.22, t))
    const alpha = clamp(edge * cassini * outerGap * innerDim * (0.5 + 0.5 * bright), 0, 1)

    const i = x * 4
    row[i] = toByte(c.r)
    row[i + 1] = toByte(c.g)
    row[i + 2] = toByte(c.b)
    row[i + 3] = toByte(alpha)
  }

  // Repeat the single computed row down the texture height (radial-only pattern).
  const bytes = new Uint8Array(RW * RH * 4)
  for (let y = 0; y < RH; y++) bytes.set(row, y * RW * 4)

  const tex = new THREE.DataTexture(bytes, RW, RH, THREE.RGBAFormat)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}
