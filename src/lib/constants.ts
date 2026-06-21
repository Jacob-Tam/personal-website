/*
  Orb scene tuning. These are the defaults leva seeds from in dev; once the look is dialed
  in, the chosen values get baked back here (docs/04). Phase thresholds for the scroll
  lifecycle (Step 8) will live here too. Keep magic numbers out of components and in here.
*/

import type { PlanetStyle } from './planetTexture'

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
  // Interlude: the orb ZIG-ZAGS down through the centered section (travelling with the downward
  // scroll) - descending while it swings once to the right, then once to the left.
  interludeRadius: 1.5, // horizontal swing amplitude each side (symmetric; shorter than the old arc)
  interludeRadiusY: 1.15, // vertical reach (top -> bottom of the descent)
  pulseAmount: 0.18, // group scale bump at the interlude beat
  rotationStill: 0.85, // how much the idle spin slows at the beat (0..1)
  interludePinVh: 0.9, // interlude pin length as a fraction of viewport height ("harder to scroll")
}

// Click-to-reveal intro (Hero start circle -> store.orbStarted/orbStartAt). The core grows in from a
// point first, then the particles pop in ONE BY ONE (a staggered cascade), so the orb assembles itself
// when the user activates it. Times in seconds from the click. Skipped (instant) under reduced motion.
export const ORB_REVEAL = {
  coreDur: 1.4, // the core eases up from scale 0 over this (slow, graceful)
  particleStart: 1.0, // particles begin appearing at this point (while the core is still finishing)
  particleStagger: 0.05, // gap between consecutive particles popping in -> the "one by one" cascade
  particleFade: 0.6, // each particle eases up over this
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
// (projectsProgress 0..1) drives a flight THROUGH space past 4 planets (one per project). Each planet
// owns a beat and flies a depth-led path: it enters as a distant speck dead ahead, grows as you zoom
// toward it, pulls in + dims for the read (its lane slides it beside a panel), then balloons past the
// camera as the next speck appears ahead. A corridor of star streaks streams past the whole time -
// coasting while you read, warping with scroll velocity as you travel (the "moving through space"
// backdrop). Neighbouring beats overlap so the next is already a speck ahead while the current sits
// arrived. TIMING lives here (shared by the 3D planets AND the 2D panels via lib/projectsJourney, so
// they stay in lockstep); SPATIAL/look/lanes/stars are seeded into the dev leva 'projects' folder.
// Bake whatever lands in leva back into the defaults here.
export const PROJECTS_JOURNEY = {
  pinVh: 5.5, // pin length (fraction of viewport height); larger = more scroll between each planet
  rotationSpeed: 0.06, // rad/s, gentle planet self-rotation (idle rate, at arrive)
  transitionSpin: 0.8, // rad/s, EXTRA self-rotation that ramps with |local phase|: ~0 at arrive (calm
  // while you read the project) up to this at the beat edges, so planets spin fast as they cross
  // BETWEEN projects and settle as each one arrives - the engaging bit of the transition
  ringSpinFactor: 0.6, // the ring orbits (spins in its own plane) at this fraction of the planet's rate

  // --- TIMING (constants; shared by canvas + DOM; not in leva so the two layers can't desync) ---
  count: 4, // number of planets/beats; beat i is centred at (i + 0.5) / count
  life: 0.26, // half-width (progress units) of a planet's presence. Smaller = consecutive planets
  // overlap LESS, so they read as further apart - more empty space travelled between worlds, and the
  // current planet sits mostly alone instead of crowded by the next one already looming.
  fadeFrac: 0.26, // fraction of the LEADING edge used to fade the mesh IN (as it appears far ahead)
  exitFadeFrac: 0.62, // fraction of the TRAILING edge used to fade it OUT - larger, so a planet has
  // mostly receded as it passes instead of lingering large over the NEXT project (the beats overlap)
  introFade: 0.11, // the whole scene eases in over the first slice of the journey (wider = smoother
  // entry from About: planets fade up gently as the pin engages instead of appearing abruptly)
  outroFade: 0.07, // and fades out over the last slice as the pin releases into Contact
  panelHalf: 0.3, // |s| within which a project's 2D media/text panels are shown (around arrive). Kept
  // BELOW the half-beat spacing (~0.42 in s units) so consecutive panels no longer overlap - that
  // leaves a planet-only stretch (no text/media) as one project exits before the next fades in. Lower
  // = longer gap between projects (but a shorter on-screen dwell per project).
  panelFade: 0.2, // soft edge of that panel window; < panelHalf so the panel still reaches full opacity
  panelRise: 10, // px the panels translate up as they fade in (subtle life)
  dimStart: -0.35, // local phase s at which a planet begins to dim (well before arrive)
  dimRange: 0.4, // length of the dim ramp
  exitDark: 0.6, // EXTRA darkening applied through the exit (after arrive). Planets are brightly lit, so
  // alpha alone leaves a passed planet looming; darkening it sinks it into the background as it balloons
  // past, so the CURRENT planet stays the focus. Only the trailing (exit) half is affected, not approach.
  minBrightness: 0.05, // floor the darkening hits near the exit (it is also fading out via opacity by then)
  disappearRange: 0.42, // (fully-disappear mode only) how fast a planet vanishes after arrive
  // --- SPATIAL path (leva-tunable). DEPTH-LED, not a sideways sweep: every planet shares a BASE path
  // (mostly along Z) that each one offsets into its own "lane" (see below), so the journey reads as
  // flying THROUGH space toward each world rather than planets sliding across a conveyor.
  //   enter  = far ahead, near screen-centre -> a distant speck you zoom toward (z deep, x/y ~ 0)
  //   arrive = the readable beat, pulled in close; the lane offset slides it beside a panel
  //   exit   = at the camera plane (z ~ +): it balloons and the lane swings it off-screen = a fly-by
  // enter->arrive (long, slow approach) and arrive->exit (short, fast pass) differ in length on purpose:
  // perspective then makes the planet drift in gently and whip past at the end.
  enter: [0, 0, -38] as [number, number, number], //   far ahead, centred -> distant speck
  arrive: [0, 0, -5.5] as [number, number, number], // pulled in close for the read (lane offsets it sideways)
  exit: [0, 0, 1.5] as [number, number, number], //    near the camera -> grows + drifts off as we pass
  dim: 0.42, // dims at arrive so the media/text read over it; stays dim as it passes
  recede: true, // arrive = recede + dim (default) vs. fully disappear (the single tunable from the spec)

  // --- LANES: each planet flies a STRAIGHT line straight toward the camera, offset laterally by a
  // CONSTANT [x, y] (only Z changes along enter -> arrive -> exit). Because the offset is constant in
  // world space, the planet's screen position moves radially OUTWARD from the centre vanishing point as
  // it nears - the exact lines the star streaks flow along - so the planet just "keeps zooming" and
  // slides off its own corner naturally, never veering sideways, and the background lines up with it.
  // The corners ALTERNATE left/right (and up/down) so you fly past worlds on BOTH sides of the screen,
  // not just one - which also keeps consecutive planets well apart (one exits left as the next comes in
  // on the right). laneYScale squashes the vertical so the planets stay in the readable band.
  laneDirs: [
    [0.72, -0.48], //  planet 0: passes on the RIGHT, low
    [-0.72, 0.5], //   planet 1: passes on the LEFT, high
    [0.72, 0.5], //    planet 2: passes on the RIGHT, high
    [-0.72, -0.48], // planet 3: passes on the LEFT, low
  ] as [number, number][],
  laneAmp: 4.0, //    constant world-space lateral offset (the reading spot + how far to the side it passes)
  laneYScale: 0.7, // global squash on the vertical lane offset (keep planets in the readable band)

  // --- STARS: the "moving through space" backdrop - a corridor of faint star streaks that stream past
  // the journey camera (three/JourneyStars). A slow constant drift keeps it alive while you read a
  // project; it accelerates into warp streaks with SCROLL VELOCITY as you travel to the next one. ---
  stars: {
    count: 460,
    spreadX: 22, //   half-width of the corridor (world units) - wide enough to fill frame near the camera
    spreadY: 13, //   half-height
    depth: 118, //    corridor length along Z (stars recycle from the near end back to the far end)
    near: 4.5, //     recycle once a star passes this far in FRONT of the camera (camZ + near)
    baseDrift: 3.0, // units/s the field always coasts toward you (gentle, while you read a project)
    boost: 92, //     scroll velocity (d projectsProgress / dt) -> extra speed. Roughly tracks the planet
    //                approach rate so the background moves WITH the planets, but a touch under for calm.
    maxSpeed: 50, //  clamp so a fast scroll flick doesn't tear the field into long streaks
    streakScale: 0.065, // world speed -> streak length. Low, so the warp stays a gentle drift of short
    //                    streaks (subtle), not an aggressive hyperspace tunnel.
    streakMin: 0.1, //  a near-point at rest
    streakMax: 2.6, //  longest warp streak (short = subtle)
    opacityBase: 0.16, // faint at coast (while reading)
    opacityPeak: 0.42, // and only modestly brighter at full warp (kept low so it stays a backdrop)
    fadeIn: 0.1, //     ease the whole field IN over the first slice of the journey (no pop at the pin)
    fadeOut: 0.07, //   and OUT over the last slice as the pin releases
    color: '#bcd4f2', // faint blue-white
  },

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

  // --- LOOK: each planet is a distinct ARCHETYPE, not the same planet recoloured. `style` selects the
  // baked surface (lib/planetTexture); the surface overrides below tune relief + material response so
  // the silhouettes and shading differ too (gas = smooth/glossy/ringed; ice = glossy/cracked; rocky =
  // matte/rugged; terran = ocean + caps). Size stays uniform (keeps the even spacing dialed in). Any
  // field left out falls back to the shared `surface` defaults above. ---
  planets: [
    // Steel-blue ocean world (leans on the accent): continents + polar ice caps.
    { color: '#4f9ad1', radius: 1.4, style: 'terran', dispAmp: 0.34, bumpScale: 0.45, roughness: 0.95, rimStrength: 0.7, rimPower: 2.6 },
    // Amber gas giant: warped bands + a storm oval, smooth + glossy, wrapped in a tilted ring.
    {
      color: '#d68a4e', radius: 1.4, style: 'gas', dispScale: 1.4, dispAmp: 0.08, bumpScale: 0.12, roughness: 0.62, rimStrength: 1.1, rimPower: 1.9,
      // Negative x-tilt puts the near edge at the BOTTOM (natural Saturn read, not a hoop over the face).
      ring: { inner: 1.5, outer: 2.25, tilt: [-1.05, 0.16], color: '#e7c79b', opacity: 0.72 },
    },
    // Teal ice world: pale frost veined with sharp cracks, glossy.
    { color: '#5bbf9a', radius: 1.4, style: 'ice', dispScale: 2.1, dispAmp: 0.26, bumpScale: 0.55, roughness: 0.5, rimStrength: 0.85, rimPower: 3.0 },
    // Violet rocky moon: matte, cratered, rugged silhouette.
    { color: '#9a7bd0', radius: 1.4, style: 'rocky', dispScale: 2.4, dispAmp: 0.55, bumpScale: 0.75, roughness: 1.0, rimStrength: 0.35, rimPower: 3.2 },
  ] as PlanetConfig[],
}

// A Saturn-style ring on a planet: radii in multiples of the planet radius, tilt [x, z] in radians.
export type PlanetRing = {
  inner: number
  outer: number
  tilt: [number, number]
  color: string
  opacity: number
}

// One journey planet. `color` + `style` pick the baked surface; the rest override the shared `surface`
// material defaults per planet (all optional). `ring` is present only on planets that wear one.
export type PlanetConfig = {
  color: string
  radius: number
  style: PlanetStyle
  dispScale?: number
  dispAmp?: number
  bumpScale?: number
  roughness?: number
  rimStrength?: number
  rimPower?: number
  ring?: PlanetRing
}

// Fixed seed so the particle distribution is identical every load (not reshuffled).
export const SEED = 1337
