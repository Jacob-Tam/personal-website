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

// Projects "solar system journey" (feat/projects-planets). A pinned section whose scroll
// (projectsProgress 0..1) drives a trip past 4 planets (one per project). Each planet owns a beat and
// flies a shared world-path enter(far, upper-right) -> arrive(near, right, behind the text) ->
// exit(off-left), growing via depth then receding + dimming at arrive; neighbouring beats overlap so
// the next fades in from the right as the current exits left. The camera dollies gently forward for a
// through-space feel. TIMING lives here (shared by the 3D planets AND the 2D panels via
// lib/projectsJourney, so they stay in lockstep); SPATIAL/look/camera are seeded into the dev leva
// 'projects' folder. Bake whatever lands in leva back into the spatial defaults here.
export const PROJECTS_JOURNEY = {
  pinVh: 4, // pin length as a fraction of viewport height (~one viewport per planet); tune in leva
  rotationSpeed: 0.06, // rad/s, gentle planet self-rotation

  // --- TIMING (constants; shared by canvas + DOM; not in leva so the two layers can't desync) ---
  count: 4, // number of planets/beats; beat i is centred at (i + 0.5) / count
  life: 0.3, // half-width (progress units) of a planet's presence; wide so neighbours overlap a lot ->
  // the NEXT planet is already small in the right-background while the current sits arrived on the left
  fadeFrac: 0.26, // fraction of the leading/trailing edge used to fade the mesh in/out
  introFade: 0.05, // the whole scene fades in over the first slice of the journey (planet 1 "arrives")
  outroFade: 0.06, // and fades out over the last slice as the pin releases into Contact
  panelHalf: 0.5, // |s| within which a project's 2D media/text panels are shown (around arrive)
  panelFade: 0.34, // soft edge of that panel window
  panelRise: 10, // px the panels translate up as they fade in (subtle life)
  dimStart: -0.35, // local phase s at which a planet begins to dim (well before arrive)
  dimRange: 0.4, // length of the dim ramp
  disappearRange: 0.42, // (fully-disappear mode only) how fast a planet vanishes after arrive
  // --- SPATIAL path (leva-tunable; every planet travels enter -> arrive -> exit in world units, the
  // SAME path for all). A flat HORIZONTAL sweep at one height (all y = 0): enters small far-RIGHT
  // (next-planet teaser), arrives LEFT behind the media (fully blocked is fine) clearing the text,
  // exits off to the left. Depth (z) still gives the grow as it approaches. ---
  enter: [9, 0, -16] as [number, number, number], //   far RIGHT -> small "next planet" teaser
  arrive: [-2.5, 0, -5] as [number, number, number], // near, LEFT, behind the media (occluded is fine)
  exit: [-9, 0, -7] as [number, number, number], //    continues off to the left (same height = horizontal)
  dim: 0.4, // gentle now (the planet sits on the LEFT, not over the text), so the current planet stays visible
  recede: true, // arrive = recede + dim (default) vs. fully disappear (the single tunable from the spec)

  // --- CAMERA (leva-tunable): STATIC during the journey (the planets carry all the motion, and the
  // screen must not move vertically). Keep the knobs at 0; raise only if a little drift is wanted. ---
  camZ: 7.5, // journey camera distance (orb uses CAMERA.position[2])
  camZTravel: 0, // forward dolly across the journey (0 = static)
  camYDrift: 0, // vertical drift amplitude (0 = no vertical screen movement)

  // --- SURFACE: procedural object-space noise + a fresnel limb injected into the planet material
  // (three/JourneyPlanet onBeforeCompile) for "soft noise" variation that rotates with the planet -
  // not photoreal textures. Tune by editing here + reloading. ---
  surface: {
    dispScale: 1.9, // frequency of the geometry displacement (low = big lumps, not spiky)
    dispAmp: 0.42, // displacement amplitude along the normal -> uneven silhouette + relief (not a perfect sphere)
    bumpScale: 0.45, // bumpMap strength -> fine surface relief that catches the light (textured feel)
    rimStrength: 0.6, // fresnel limb brightening on the lit edge (atmosphere-ish; dims with the planet)
    rimPower: 2.6, // fresnel falloff; higher = thinner rim
  },

  // --- LOOK (size + colour): visually DISTINCT, cohesive in dark space. Recolour trivially here. ---
  planets: [
    { color: '#4f9ad1', radius: 1.25 }, // steel blue (leans on the accent)
    { color: '#d68a4e', radius: 1.6 }, // warm amber
    { color: '#5bbf9a', radius: 1.0 }, // teal
    { color: '#9a7bd0', radius: 1.4 }, // violet
  ],
}

// Fixed seed so the particle distribution is identical every load (not reshuffled).
export const SEED = 1337
