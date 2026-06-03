/*
  Orb scene tuning. These are the defaults leva seeds from in dev; once the look is dialed
  in, the chosen values get baked back here (docs/04). Phase thresholds for the scroll
  lifecycle (Step 8) will live here too. Keep magic numbers out of components and in here.
*/

export const CAMERA = {
  fov: 50,
  position: [0, 0, 6] as [number, number, number],
}

export const CORE = {
  radius: 0.4,
  segments: 64,
  emissive: 1.3, // brightness multiplier; > 1 so bloom catches the lit side (lower so the
  // directional shading reads as a 3D sphere instead of a blown-out white disc)
  pulseAmplitude: 0.02, // breathing scale amplitude
  pulsePeriod: 3, // breathing period in seconds
  noiseAmp: 0.18, // strength of the internal turbulence
  noiseScale: 1.6, // spatial frequency of the noise
  noiseSpeed: 0.25, // how fast the turbulence evolves
  fresnelPower: 2.2, // rim falloff; higher = thinner blue rim
  coreColor: '#eaf3ff', // near-white with a faint blue cast
  rimColor: '#6bb0dc', // --color-accent-hi
}

export const PARTICLES = {
  count: 50, // sparse and elegant (docs/04)
  planes: 4, // distinct tilted orbital planes, stylized Bohr-atom feel
  radiusMin: 1.2,
  radiusMax: 2.6,
  speedMin: 0.1, // rad/s
  speedMax: 0.4,
  sizeMin: 0.015,
  sizeMax: 0.04,
  hueMin: 205, // steel-blue family for most particles
  hueMax: 220,
  purpleFraction: 0.3, // ~30% of particles take a blue-violet hue instead (Jacob's request)
  purpleHueMin: 255,
  purpleHueMax: 275,
  saturation: 0.7,
  lightnessMin: 0.55,
  lightnessMax: 0.7,
  brightness: 1.5, // HDR multiplier so bloom catches the points
}

export const LIGHTS = {
  ambient: 0.1,
  pointIntensity: 2, // point light at the core (decay 2)
}

export const GROUP = {
  idleSpinY: 0.04, // rad/s, slow overall rotation of the whole orb system
}

export const CURSOR = {
  lerp: 0.05, // trailing ease; the orb chases the cursor with a lag (docs/04)
  clampX: 1.2, // max horizontal drift in world units (never far enough to hide the name)
  clampY: 0.8, // max vertical drift
}

export const CHOREOGRAPHY = {
  driftDistance: 8, // world units the orb rises (group.y) from its below-text interlude end to off-screen
  positionLerp: 0.05, // floatier ease toward the scroll-driven target (less snappy)
  // Interlude: the orb arcs clockwise around the centered text - starts above it, swings through
  // the right, ends below it at horizontal center.
  interludeRadius: 2.1, // radius of that arc (clears the text on all sides)
  pulseAmount: 0.18, // group scale bump at the interlude beat
  rotationStill: 0.85, // how much the idle spin slows at the beat (0..1)
  interludePinVh: 0.9, // interlude pin length as a fraction of viewport height ("harder to scroll")
}

export const SHED = {
  startFraction: 0.15, // driftProgress at which the first particles begin to release
  lift: 5, // extra upward distance a fully-released particle travels
  outward: 0.6, // slight outward drift as it releases
}

export const FOG = {
  near: 4,
  far: 9.5,
  color: '#000102', // --color-bg, so distant particles fade into the page
}

export const BLOOM = {
  intensity: 0.75, // subtle/technical, not white-hot dreamy (docs/04 C9)
  luminanceThreshold: 0.6, // only the bright orb/particles bloom, not the dark bg
  luminanceSmoothing: 0.4,
  radius: 0.7, // spread of the mipmap blur
}

export const VIGNETTE = {
  enabled: true, // very subtle; toggle off in leva if it muddies the scene
  darkness: 0.35,
  offset: 0.35,
}

// Projects "solar system journey" (feat/projects-planets). A pinned section whose scroll drives a
// camera-through-space trip past 4 planets (one per project). Camera path + per-planet pacing land
// in step 2; these are the defaults the dev leva 'projects' folder seeds from. Bake leva back here.
export const PROJECTS_JOURNEY = {
  pinVh: 4, // pin length as a fraction of viewport height (~one viewport per planet); tune in leva
  rotationSpeed: 0.06, // rad/s, gentle planet self-rotation
  // Step-1 placeholder: ONE planet parked in the right-background (no camera travel yet).
  planetPosition: [2.8, 0.5, -3] as [number, number, number],
  // The 4 planets - visually DISTINCT (size + colour), cohesive in the dark space. Recolour here.
  planets: [
    { color: '#4f9ad1', radius: 1.25 }, // steel blue (leans on the accent)
    { color: '#d68a4e', radius: 1.6 }, // warm amber
    { color: '#5bbf9a', radius: 1.0 }, // teal
    { color: '#9a7bd0', radius: 1.4 }, // violet
  ],
}

// Fixed seed so the particle distribution is identical every load (not reshuffled).
export const SEED = 1337
