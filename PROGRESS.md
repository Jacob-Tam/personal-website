# PROGRESS.md — live build status

Single source of truth for resuming. Overwrite stale info; this is status, not a log.
Build sequence: `docs/08-build-order.md`. After each step: stop, show Jacob, commit.

## ACTIVE WORK — branch `feat/projects-planets` (Projects "solar system journey")

NEW FEATURE, off `main` (main stays deployable — do NOT touch it). Re-architects Projects from the
2-col card grid into a PINNED 3D journey: scroll locks, the canvas re-enables, and the camera travels
past 4 distinct planets in shared 3D space (one per project). Per project: planet travels in from the
right-background, ARRIVES + recedes/dims, MEDIA fades in LEFT + TEXT fades in RIGHT (in front of the
dimmed planet), then it drifts OFF LEFT as the next fades in. Faint giant "PROJECTS" word fixed behind
the whole journey. Mobile/low-power + reduced-motion: NO pin/3D, flat stacked sections. Full spec is
in Jacob's feature prompt (not in docs/); the 5-step build approach is below.

Build approach: (1) static pinned section + canvas re-enable + ONE parked planet + project-1 panels.
(2) camera travel + all 4 planets + travel-in/arrive(recede+dim)/travel-out rhythm + per-project panel
fades. (3) 4-stop scroll indicator. (4) mobile/reduced-motion flat fallback polish. (5) bake leva ->
constants + r3f-perf pass. Checkpoint + commit after each; commit WIP sub-pieces during step 2.

### STEP 1 — DONE (static). Pin wiring, canvas re-enable, one placeholder planet, project-1 panels.
- Store (`useScrollStore`): `projectsActive` (bool, low-freq, drives canvas) + `projectsProgress`
  (0..1 high-freq scrub) + setters. Read high-freq via getState() in useFrame; subscribe to low-freq.
- Scroll (`lib/lenis.ts`): Projects PIN ScrollTrigger — `#projects`, `start top top`,
  `end '+= innerHeight * projectsPinVh'`, pin+scrub+anticipatePin+invalidateOnRefresh,
  onUpdate->setProjectsProgress, onToggle->setProjectsActive. Created LAST (after interlude pin) so
  pin order stays top-to-bottom. `setProjectsPin()` live-tunes length (re-refreshes ST). Only created
  in the full-power branch (lowPower/reducedMotion get NO pin), so the fallback needs no extra gating.
- Constants: `PROJECTS_JOURNEY` (pinVh 4, rotationSpeed 0.06, single `planetPosition` for step 1, and
  a 4-entry `planets` color/radius array for step 2). Dev leva 'projects' folder seeds from it.
- Canvas (`three/Scene.tsx`): swaps `OrbSystem` out for `<ProjectsScene>` while `projectsActive`;
  disables fog during the journey (planets live in deep space, not the orb's fog).
- `three/ProjectsScene.tsx` + `three/Planet.tsx`: a directional light + ONE shaded sphere
  (meshStandardMaterial, gentle self-rotation) parked in the right-background. SEPARATE system from the
  ambient CSS `shared/Planets.tsx` — no shared geometry, no orb connection.
- `projects/Projects.tsx` REBUILT: `lowPower || reducedMotion ? <ProjectsFlat/> : <ProjectsJourney/>`.
  Journey = a single `h-screen overflow-hidden` `#projects` (so the pin keeps vertical position fixed),
  sr-only `<h2>`, BackgroundWord (centered, NO parallax — fixed backdrop), and project-1's media-left /
  text-right panels (absolute inset-0, vertically centered, content z-20 in front of the canvas planet).
  Flat = the 4 projects stacked single-column (ProjectMedia + ProjectText), normal scroll, <Reveal>
  (opacity-only under reduced motion). Old card grid + ProjectExpanded overlay no longer used by
  Projects (files left in place per the prompt; `ProjectCard.tsx`/`ProjectExpanded.tsx` now dead).
- `projects/ProjectMedia.tsx` (LEFT, 2D/DOM, placeholder-aware, forwardRef <video> preload=none) +
  `projects/ProjectText.tsx` (RIGHT, inline title/tagline/description/Geist-Mono tags) — created + wired.
- TWO lifecycle fixes made this step (both needed once the canvas comes back for Projects):
  - `Scene` frameloop terminal state `'never'` -> `'demand'`. 'never' RETAINS the last frame; the orb
    used to drift fully off-screen before idling so its last frame was empty, but the parked planet does
    NOT leave the screen, so 'never' froze it over Contact. 'demand' renders ONE settling frame on the
    scene-graph change (ProjectsScene unmounts) -> clears the planet -> then idles at ~0 GPU (same as
    'never' in spirit; honours docs/09's "stop rendering after exit"). Final expr:
    `!reducedMotion && (projectsActive || phase !== 'past') ? 'always' : 'demand'`.
  - `useOrbChoreography`: orb position is normally LERPED toward the scroll target; OrbSystem unmounts
    during the journey and remounts at the origin after, so under 'demand' it rendered ONE frame mid-lerp
    = a frozen centered orb over Contact. Fix: SNAP to target on the first frame after (re)mount
    (`settled` ref; alpha=1 first frame, then normal lerp). Position is a pure fn of scroll state, so
    snapping is always correct; lerp is only for in-motion smoothing. Hero/interlude/about unaffected
    (no remount there — OrbSystem stays mounted whenever !projectsActive).
- VERIFIED on desktop (1440-wide, dev :5175, Chrome DevTools MCP): pin engages (projectsActive true,
  projectsProgress scrubs 0..1, #projects == 1 viewport tall), planet renders in the right-background,
  project-1 media-left/text-right panels + fixed PROJECTS word render, 60fps / ~18 draw calls. Pin
  releases into Contact with the canvas CLEAN (0 calls, no frozen planet, no centered orb). Hero
  (orb centered + particles), About (orb drifting up + shedding) re-checked intact; phase chain
  hero->interlude->about->past correct. Mobile (390-wide reload): lowPower true, 0 canvases, 0
  pin-spacers, Projects renders as the tall stacked flat fallback. `npm run build` green.
- KNOWN step-1-only (resolved by step 2, do NOT "fix" now): the planet sits static at full brightness
  and the panels are static (no travel/recede/dim/fades yet); project-1 text overlaps the bright planet
  a bit (step 2's arrive=recede+dim fixes readability). Indicator NOT mounted yet (step 3).
- DEVIATION noted: the "PROJECTS" word lost its parallax (`parallax={0.5}` -> none). New spec wants it
  FIXED in the deep background for the whole journey; the flat fallback is mobile/reduced where parallax
  is off by policy anyway. (Supersedes docs/05 parallax item #2, which described the old scrolling grid.)

### STEP 2 — DONE (the core choreography: 4 planets + camera travel + panel fades).
- MODEL: each planet owns a beat centred at (i+0.5)/count and flies a SHARED world-path
  enter(far, upper-right) -> arrive(near, right, behind the text) -> exit(off-left), as a function of
  its signed local phase s = (progress - center)/life. Depth (z) gives the grow/shrink; recede+dim at
  arrive = the material colour multiplied toward black (also drops it below the bloom threshold) so it
  settles into a quiet, readable backdrop. `life` (0.2) > half the beat spacing (0.125), so consecutive
  beats overlap -> the next planet fades in from the right as the current exits left. Whole-scene
  intro/outro fade so planet 1 fades in as the pin engages and the last clears as it releases.
- `lib/projectsJourney.ts`: ONE pure module - planetMotion() (position/opacity/brightness/visible),
  panelOpacity() (2D panel fade), journeyActiveIndex() (which video plays). Read by BOTH the canvas
  (three/JourneyPlanet useFrame) and the DOM panels (projects/Projects rAF) off the SAME
  projectsProgress, so 3D + 2D stay locked. Timing all from PROJECTS_JOURNEY -> the two layers can't
  desync (positions can differ harmlessly while leva-tuning; panels depend only on timing).
- `three/JourneyPlanet.tsx` (NEW, replaces Planet.tsx): shaded sphere, per-frame transform/opacity/
  brightness from planetMotion; mesh.visible=false when faded (draw-call saver -> only 1-2 planets draw
  at once). `three/ProjectsScene.tsx`: directional light + the 4 planets (colour/radius from
  PROJECTS_JOURNEY.planets). `three/Scene.tsx`: NEW `CameraRig` (always mounted) owns the default
  camera EVERY frame - journey path (gentle forward dolly camZ->camZ-camZTravel + vertical drift,
  looking straight -Z so blocking is predictable) while projectsActive, else the orb spot
  [0,0,distance]. It MUST stay mounted to restore the orb camera, or the camera stays parked where the
  journey left it. New leva 'projects' folder = the SPATIAL/look knobs.
- `projects/Projects.tsx`: journey renders all 4 media-left/text-right panels stacked (absolute
  inset-0), opacity+rise driven by a rAF hook (useJourneyPanels) writing refs (no per-frame re-render);
  activeIndex is the only React state (flips ~4x) and gates which video plays.
  `projects/ProjectMedia.tsx`: takes `isActive`, plays/pauses its <video> (guarded; no-op until
  MEDIA_READY, so nothing autoplays now or on mobile).
- LEVA vs CONSTANTS split: TIMING/pacing (count, life, fades, panel window, dim ramp, planetY) =
  CONSTANTS in PROJECTS_JOURNEY (shared with the DOM, baked, NOT leva). SPATIAL/look/camera = leva
  'projects' folder (pinVh, rotationSpeed, camZ, camZTravel, camYDrift, enterX/Z, arriveX/Y/Z, exitX/Z,
  dim, recede). Bake leva -> PROJECTS_JOURNEY by hand. Colours/radii stay constants (trivial recolour).
- TUNED this step (from screenshots): dim 0.62->0.72, dimStart -0.05->-0.35, dimRange 0.55->0.4 so the
  arrived planet is dim BEFORE the text peaks over it (first pass washed the tags out); arrive
  [2.6,0,-3.6]->[2.7,0,-4] (a touch back/right); planetY magnitudes reduced so big planets don't sit on
  the tag row. recede=true default (fully-disappear is the leva toggle).
- VERIFIED (desktop 1440, dev :5175, Chrome MCP): all 4 beats - blue/amber/teal/violet, each a dim
  readable backdrop behind media-left/text-right; smooth cross-fades mid-travel (planet exits left
  dimmed as next enters right bright); intro/outro fades; clean release into Contact (0 calls, no
  frozen frame); hero orb + About drift re-checked intact (CameraRig restores the orb camera). Steady
  60fps, <=19 draw calls, ~3-6k tris. `npm run build` green.
- STILL OPEN / for Jacob to tune in leva then bake: overall pacing (pinVh 4 = ~1 viewport/planet);
  exact planet colours/sizes (constants); whether to lean the camera harder into "through space"
  (camZTravel/camYDrift currently gentle so blocking stays predictable - the planets carry the motion).

### STEP 3 — DONE (4-stop scroll indicator).
- Reworked `projects/ScrollIndicator.tsx` (reused, not a second component): dropped its own
  ScrollTrigger (couldn't track under the pin) and now drives off the store. visible = projectsActive
  (subscribe, low-freq); marker transform + active dot from projectsProgress via a rAF loop writing the
  marker ref (setActive only on integer change). The marker maps the beat span
  [FIRST_BEAT, LAST_BEAT] = [0.5/n, (n-0.5)/n] onto the full track, so it lands ON dot i exactly when
  planet i arrives and slides between. Active dot lit accent, others muted; "01".."04" in Geist Mono.
  Mounted in ProjectsJourney (so absent on mobile/reduced already); hidden (opacity-0) outside the pin.
- VERIFIED: marker advances 01->03 across the beats with the right dot lit; hidden at hero
  (opacity 0, projectsActive false); coexists with the fixed PROJECTS word. Build green.
- TEST CAVEAT (not a bug): `lenis.scrollTo(0, {immediate:true})` from INSIDE the engaged pin doesn't
  stick (the GSAP pin recaptures and snaps back) - it briefly flips the store to hero then returns to
  the pin. Only happens with programmatic immediate jumps out of an active pin; real wheel scrolling
  scrubs the pin incrementally and releases fine (engage/release verified steps 1-3). To screenshot the
  hero cleanly, RELOAD (lands at top) rather than immediate-jumping out of the pin.

### REFINEMENT — About->Projects scroll JOLT fixed (Jacob: "flicky/jolty" at that seam).
About ends and the Projects pin starts at the SAME scrollY (2851; adjacent sections), so several
things piled onto that one boundary frame and made it long -> Lenis lurched the scroll on the next
tick (measured a ~15px/frame spike vs ~3 normal). Fixes (all in three/Scene + JourneyPlanet + lenis):
- Don't mount/unmount the 3D at the seam. The orb AND the planets are now BOTH always mounted and
  toggled by group VISIBILITY (`<group visible={!projectsActive}>` around OrbSystem; ProjectsScene
  always mounted, its planets self-hide via opacity). Building/disposing the orb particles + 4 planets
  on one frame was the biggest hit.
- Don't toggle scene.fog. It's mounted the whole time now; the planets opt out with material
  `fog={false}`. Adding/removing scene.fog recompiles every material mid-scroll.
- `<Preload all />` precompiles all shaders up front, so a planet's material doesn't compile the first
  frame it becomes visible at the seam.
- Removed `anticipatePin` from the Projects pin: with Lenis already smoothing the wheel, ST's
  velocity-based pre-pin lookahead just overshot and lurched. (Interlude pin left as-is - no complaint
  there, and nothing swaps visually at that seam.)
- The directional light stays on always (the orb is unlit - custom shader + MeshBasicMaterial - so it
  has no effect outside the journey), keeping the light count constant so materials don't recompile.
VERIFIED: dispatched real wheel events across the seam -> uniform ~10px/frame, NO spike (the residual
spike only showed with programmatic lenis.scrollTo fighting the pin, not a user path). Hero orb
centered, About drift+shed intact, journey + indicator intact, 60fps. Build green.
- KNOWN minor edge case (pre-existing, NOT this change, self-heals on first scroll, did not fix):
  reloading the page WHILE scrolled inside the Projects pin -> browser scroll restoration feeds that
  position into ScrollTrigger before the loader resets to 0, leaving the #about scrub's driftProgress
  stale (~0.36) so the hero orb sits high until the first scroll. Loading from the top is clean. If it
  ever bugs Jacob: after the loader's scroll reset, call ScrollTrigger.refresh()/update() so the scrubs
  recompute to 0.

### REFINEMENT — planet surfaces: TEXTURE MAPS + displacement + fresnel (Jacob: "too perfect, add
textures"). Three layers, no external image assets:
- TEXTURE MAPS (`lib/planetTexture.ts` makePlanetSurface, per planet, baked once at load): a colour
  `map` + a `bumpMap`, generated by sampling 3D value-noise fbm at the sphere-surface point per
  (lon,lat) texel - SEAMLESS at the longitude wrap and clean at the poles (no canvas-noise seam /
  pole-pinch). Two tones of the planet's own hue blended by low-freq noise = continents/marbling; a
  higher-freq layer = fine detail + the bump. 256x128 DataTextures, fast int hash. Each planet's hue
  comes from the map, so per-frame dimming sets material.color to a GREY scalar (brightness) to darken
  below the bloom threshold at arrive.
- VERTEX displacement (`three/JourneyPlanet` onBeforeCompile): each vertex pushed along its normal by
  object-space fbm -> uneven silhouette + relief; normal recomputed from two displaced tangent
  neighbours so lumps catch light. Sphere 64x48 so it reads as smooth lumps, not facets.
- FRAGMENT fresnel limb (onBeforeCompile) on the lit edge, rides on diffuseColor so it dims too.
~6k tris/planet, +8 small textures; only 1-2 planets visible at once -> still 60fps / 18-19 calls
(27 textures total). Params in `PROJECTS_JOURNEY.surface` (dispScale 1.9, dispAmp 0.42, bumpScale 0.45,
rimStrength 0.6, rimPower 2.6); the texture look (tones, frequencies, 256x128) is in planetTexture.ts.
Verified bright (detailed, irregular) and dimmed at arrive (clean readable backdrop); hero orb intact.

### STEP 4 — DONE (mobile + reduced-motion flat fallback).
- `ProjectsFlat` (built in step 1) is the fallback: the 4 projects stacked, each a ProjectMedia +
  ProjectText inside a `<Reveal>` (grid md:grid-cols-2 -> 1 col on mobile), normal scroll, the faint
  PROJECTS word as a static header backdrop, NO canvas/pin/scroll-indicator. Rendered whenever
  `lowPower || reducedMotion` (the pin + planets are already gated off for those in lib/lenis + App).
- Polish this step: ProjectMedia gained a `controls` prop; the flat fallback passes it so a visitor can
  actually PLAY the video (the journey keeps its control-free auto-play showcase). No autoplay on mobile
  (isActive undefined -> paused), matching docs/03. (No-op until MEDIA_READY, but the fallback is then
  "fully usable" as required.)
- VERIFIED (Chrome MCP): mobile width -> lowPower true, 0 canvases, 0 pin-spacers, single-column
  media-over-text with wrapping Geist-Mono tags, clean spacing; desktop + forced
  prefers-reduced-motion -> reducedMotion true, projects NOT pinned, calm 2-col media-left/text-right,
  opacity-only reveals, canvas faded out (step 13). Same content both ways, fully readable. Build green.
- Still owed (pre-existing, docs/08 Step 12): a REAL-device test + a real orbStill image - Jacob's.

### NEXT ON RESUME — STEP 5 (bake leva + perf pass) = the last step.
- Bake whatever Jacob lands on in the dev leva 'projects' folder into PROJECTS_JOURNEY by hand (camZ,
  camZTravel, camYDrift, enter/arrive/exit XYZ, dim, recede, rotationSpeed, pinVh). Surface +
  timing are already constants. Until he tunes, the current defaults look good.
- r3f-perf pass: already ~60fps / <=19 draw calls / ~3-6k tris through the journey; both 3D systems are
  mounted the whole time now (orb hidden during the journey) - confirm that didn't cost idle FPS
  elsewhere. Re-verify hero/interlude/about (prompt rule) after any change.
- Then the Projects-planets feature is complete on this branch -> review + merge to main when Jacob's happy.

## Current position (main branch — pre-feature; unchanged, still deployable)
- **Step 15: performance pass DONE for everything not blocked on media/deploy.**
  - `7442934`: stripped leva + r3f-perf from PROD. `lib/devControls.ts` wraps leva's useControls,
    dynamically importing leva only in dev (DCE'd in prod, schema defaults in prod); Scene
    lazy-loads DevPanel in dev only. 0 leva/r3f-perf in prod.
  - `e2985f0`: code-split three.js. App React.lazy's `<Scene>` (Suspense); three+drei+postprocessing
    = a separate 965kB chunk. Initial chunk 1,522 -> 354 kB (gzip 441 -> 120). Loader covers the
    lazy load (waits on canvasReady); low-power never loads three.
  - `068be9d`: Canvas frameloop 'demand' under reduced motion (static orb renders once then idles
    instead of 60fps); OrbParticles invalidate() after colour/brightness effects so colours paint
    under demand. Normal mode unchanged ('always' -> 'never' at phase 'past'). Verified colours OK.
  - DEFERRED (blocked, not doable now): lazy-load + in-view play for project videos and
    compress/resize media -> need real media (MEDIA_READY still false); add the in-view <video> hook
    when media lands. Run Lighthouse (mobile) on the DEPLOYED prod build (localhost metrics noisy) ->
    do it during/after Step 16 deploy, then fix the worst.
- **Step 14: SEO + meta DONE (`6a623bf`).** index.html meta (description = verbatim tagline,
  theme-color, canonical, OG + Twitter card, Person JSON-LD). Favicon + OG assets generated from
  the JT logo (favicon.ico/-32/apple-touch + og-image.png with a blue glow). Scaffold favicon.svg
  removed. Absolute URLs assume jacobtam.me; sameAs omitted until real social URLs. Verified 200s.
- **Step 13: reduced motion + a11y floor DONE (`bbe44d5`).** prefers-reduced-motion -> static orb
  (spin/breathing/orbit frozen), choreography + interlude pin skipped, canvas fades out (opacity)
  leaving the hero, no cursor/parallax, opacity-only reveals, no loader stars. a11y: accent
  :focus-visible ring, text-mute bumped to #797B80 for WCAG AA (4.93:1), decorative layers
  aria-hidden, project overlay focus in/return. Verified across reduced/normal/keyboard.
- **Step 12: mobile / low-power fallback DONE (`ee6a337`).** store.lowPower (lib/gpuTier.ts:
  max-width 768 or no WebGL, resolved once at load) gates the canvas: low-power skips `<Scene>`,
  Hero shows a static orb, lenis skips choreography + the interlude pin, Parallax + hero pointer
  no-op, and the loader stops waiting on canvasReady. Verified at a phone viewport; desktop 3D
  unchanged. NOTE: still owed a real-device test (docs/08 asks for it) + a real `orbStill` image.
- **Step 11: loading screen DONE (`e2d2d9a`).** JT logo + blue progress + white shooting stars.
- **Step 10: scroll indicator DONE (`c6398e3`); clip-path expand DEFERRED** until the real smartbox
  video is in (it's the half that needs the clip; most cuttable per docs/08).
- Steps 0-13 complete (10b deferred); plus Jacob refinements (ambient stars + planets backdrop, a
  horizontal-scrollbar fix, dev-panel readability), the removed Projects particle trace, nav-fade.
  Current.

## Next action on resume
- Jacob: verify the mobile fallback on a REAL phone (docs/08 Step 12 explicitly asks for it; only
  emulated so far). Also owes a real static orb still for `/media/orb-fallback.jpg` (ASSETS.orbStill);
  Hero uses a CSS glow placeholder until then.
- **LOADING PAGE IS NOT FINAL** (Jacob wants to keep iterating). Open items:
  - Progress-bar fill timing feels "too even"/linear and he liked it more BEFORE (the snappier feel
    pre-MIN_DURATION-1800). Current fill is linear: `Math.min(92, elapsed/MIN_DURATION*92)` then a
    lerp to 100 on ready. To explore: an ease-out fill (fast start, slow approach), a non-linear/
    stepped curve, and/or dropping MIN_DURATION back down. Ask which "before" feel he means.
  - DONE this round: hero name no longer shows during load - it fades in only AFTER the loader fully
    fades out (reveal deferred to FADE_MS); white progress bar; ambient `<Starfield>` behind the
    logo (seeded == page positions); MIN_DURATION 1800, FADE_MS 1200. He floated a "fully black page"
    idea - the name-fade-in covers the spirit, revisit if he still wants more.
- HEADS-UP: Step 13 nudged `--color-text-mute` from the doc's #6D6E71 to #797B80 for WCAG AA
  contrast (4.1 -> 4.93:1). If Jacob prefers the exact doc grey, revert and accept the shortfall.
- **Step 16 - Easter egg + polish + deploy** (in progress):
  - Easter egg #1 DONE (`e47e2be`): off-list alien saucer fly-by (shared/Spaceship.tsx) - Jacob's
    request, not the docs/02 list. Tunables: CHANCE (0.1), INTERVAL_MS (10000), Saucer width (18px).
    NOTE at 3/4-planet size the saucer reads as a small blue blip in flight (detailed design only
    fully legible larger) - offer to size up if Jacob wants it more obviously a UFO.
  - Easter egg #2 DONE (`c4a3c80`): type "67" -> orb supernova (core flash + swell, particle burst
    that eases back into orbit). lib/supernova.ts (envelope + SUPERNOVA tunables: duration 1.8,
    burstDistance 2.2, flashEmissive 1.5, coreSwell 0.4), lib/useSupernova.ts (key listener, off
    under reduced motion / text fields / modifier combos), applied in Orb.tsx + OrbParticles.tsx.
    Verified the burst + re-form. burstDistance 2.2 throws particles ~off-screen at peak (dramatic);
    dial down if Jacob wants it more contained.
  - Then: final timing/easing polish; deploy to Vercel + wire jacobtam.me + add a GitHub remote;
    run Lighthouse on the LIVE site and fix the worst. Step 15's media-dependent bits (lazy/
    compressed project videos) still wait on real media.
- SEO follow-ups owed: real OG/share works once deployed to jacobtam.me (absolute URLs assume it);
  add real GitHub/LinkedIn/Instagram URLs to JSON-LD `sameAs` (+ lib/assets.ts LINKS). Optional:
  a more descriptive <title> (currently just "Jacob Tam"); would need new copy, so ask first.
  The 32px favicon is a small letterboxed JT (the wide monogram doesn't fill a square) - a dedicated
  square mark would be crisper if Jacob wants.
- **Step 10b (clip-path expand) still DEFERRED** until the trimmed smartbox video is at
  `/public/media/smartbox.mp4` and MEDIA_READY is true. When ready: a pinned element expands from a
  small rounded rect to fullscreen via clip-path/scale as you scroll end-of-About -> Projects,
  settling into the first card; mobile/reduced shows the card normally. Mind the interplay with the
  interlude pin (ScrollTrigger order).
- Note (Step 15): `overflow-x: clip` on html now kills a stray ~15px horizontal scrollbar from the
  full-bleed fixed layers + GSAP pin-spacer rounding up to full viewport width incl. scrollbar.

- Step 9 (parallax system):
  - `shared/Parallax.tsx`: reusable wrapper (GSAP + Lenis-synced ScrollTrigger; outer trigger +
    animated inner so it can't feed back; speed > 0 = scrolls slower/recedes; reduced-motion off).
  - `shared/BackgroundWord`: optional `parallax` prop - animates a nested inner span so parallax
    doesn't clobber the outer span's centering transform.
  - Applied: PROJECTS/ABOUT/CONTACT words slower (0.4-0.5); About photo slower than its text (0.15);
    project media slower than its caption (0.08, wrapped in ProjectCard - the button stays
    untransformed so the circuit trace + border latch are unaffected).
  - Verified: bg word inner span carries the parallax transform; cards render; trace still lights;
    no console errors. Disabled under prefers-reduced-motion (mobile gating is Step 12).

## Feature: Projects circuit trace - REMOVED (commit `68fcac9`)
Removed: it competed with the Step 10 right-edge scroll indicator. ProjectsTrace + its
border-lighting + trace CSS are deleted. A standalone "cards light as you scroll to them" effect
could be re-added later (per-card ScrollTrigger) without the center particles. History of what it
was, for reference:
- `projects/ProjectsTrace.tsx`: scroll-driven SVG PARTICLE STREAM down the CENTER of the Projects
  section (no horizontal connector lines as of v3). Small glowing particles in the ORB palette
  (steel-blue + ~30% blue-violet, varied size, glow) at even medium spacing, plus 1-2 larger ones at
  the top. As the scroll front (scrubbed ScrollTrigger, start 'top 70%' so it begins just after the
  orb exits) descends, each particle SLIDES IN FROM THE RIGHT + fades in; when the front reaches a
  card's level its border lights and STAYS lit (latched via `data-lit` -> index.css
  `[data-lit] .project-card-media`). Slide = a wrapping `<g>` transform; a CSS float (`trace-float`)
  on the circle adds gentle life. Built in DOM/SVG (orb canvas is off here).
- Card positions via getBoundingClientRect relative to the grid container (offsetTop was wrong:
  cards' offsetParent is their transformed Reveal wrapper). Re-measured on resize (ResizeObserver).
- Gated: renders at >=768px with motion allowed (matchMedia in Projects); else no trace, borders
  muted. Step 12/13 formalize lowPower/reduced-motion via the store.
- Tunables (in-component constants): PARTICLE_SPACING, BIG_PARTICLE_COUNT, REVEAL_SPAN (fade/slide
  speed), ENTER_FROM_RIGHT (right-side entry distance), the trigger start ('top 70%'); particle
  size/hue/glow. Could expose in leva / lib/constants later.
- (The earlier "slide-in from the right / start after the orb leaves" revisit is now moot - the
  whole trace was removed.)
- Verified at 1200px: blue/violet particle stream + branches, top borders lit, no console errors.

## Done so far
- Step 0: Vite 8 + React 19 + TS 6 scaffold; full dep stack installed (see package.json).
  Renamed `MD files/` → `docs/`. gitignored `/Assets/` and `.claude/settings.local.json`.
- Step 1:
  - `src/index.css`: Tailwind v4 `@import "tailwindcss"` + `@theme` tokens (palette, fonts,
    type scale with line-height/tracking/weight) + base layer (near-black bg, text color,
    Geist body font, selection color).
  - Fonts self-hosted via `@fontsource-variable/geist` + `@fontsource-variable/geist-mono`,
    imported in `src/main.tsx`. Family names: `"Geist Variable"`, `"Geist Mono Variable"`.
  - `src/components/shared/GrainOverlay.tsx`: fixed full-viewport SVG feTurbulence grain,
    `opacity 0.04`, `z-10`, pointer-events none, grayscale, static.
  - `src/App.tsx`: temporary Step-1 specimen (mono label + display name + body-lg tagline +
    accent hairline) to verify tokens/fonts/grain. **Gets replaced in Step 2+.**
  - `index.html` title → "Jacob Tam". Removed scaffold demo (App.css, src/assets/*, icons.svg).
  - `src/vite-env.d.ts`: vite/client reference + ambient declarations for the two fontsource
    side-effect imports (TS couldn't resolve the bare specifiers otherwise).
  - Verified: dev server runs (localhost:5174), `npm run build` passes (TS + Vite + Tailwind),
    console clean. Screenshot reviewed.
- Step 2:
  - `src/store/useScrollStore.ts`: Zustand skeleton with the full ScrollState shape from
    docs/03 (scrollProgress, heroProgress, mouse, phase, isLoaded, reducedMotion, lowPower) +
    setters. `OrbPhase` type exported. Defaults: phase 'hero', everything else 0/false. Not
    consumed yet (wired up Step 5/7/8/11/12/13).
  - Section stubs, each a full-height `<section>` with an `id` (for later anchor scroll) and a
    centered mono `NN / name` label: `nav/Nav.tsx` (fixed top bar, h-16, z-30), `hero/Hero.tsx`
    (01), `interlude/Interlude.tsx` (02), `about/About.tsx` (03), `projects/Projects.tsx` (04),
    `contact/Contact.tsx` (05). Sections after Hero have a `border-t border-border` hairline.
  - `src/App.tsx`: composes Nav + the 5 sections inside `<main class="relative z-20">`, keeps
    GrainOverlay, leaves comment markers for the Step 3 canvas mount and the Step 3+ analytics
    drop-in. Step 1 specimen removed.
  - Verified: build passes, console clean, full-page screenshot shows 5 sections in order with
    fixed nav and hairline dividers; page scrolls top to bottom.
- Step 3:
  - `lib/constants.ts`: orb tuning defaults (CAMERA, CORE, PARTICLES, LIGHTS, GROUP, FOG, SEED).
  - `three/Scene.tsx`: single persistent `<Canvas>` in a `pointer-events-none fixed inset-0 z-0`
    div. drei PerspectiveCamera (leva fov/distance), scene `<fog>` for depth, low ambient +
    point light at core. `OrbSystem` group (core + particles) slow idle-spins on Y. leva folders
    (camera/core/particles/depth/lights) + r3f-perf, both DEV-only.
  - `three/coreShader.ts` + `three/Orb.tsx`: emissive core, blue fresnel rim, 3D-simplex
    internal turbulence, HDR output (toneMapped false), sinusoidal breathing.
  - `three/OrbParticles.tsx`: 50 particles on `planes` tilted orbital planes as ONE instanced
    mesh (IcosahedronGeometry detail 1, MeshBasicMaterial toneMapped false). Deterministic via
    mulberry32(SEED): per-instance plane/radius/speed(mixed dir)/phase/size, per-instance hue
    via setColorAt, global brightness gain via material.color for HDR. Orbit math in useFrame
    (position is a pure function of elapsed time -> frame-rate independent). Depth dimming via fog.
  - Verified: 60fps, 2 draw calls (core + 1 instanced), ~12k tris; particles animate (two
    screenshots show movement). Core is flat-bright until Step 4 bloom.
- Step 4:
  - `lib/constants.ts`: added BLOOM (intensity 0.75, threshold 0.6, smoothing 0.4, radius 0.7)
    and VIGNETTE (enabled, darkness 0.35, offset 0.35).
  - `three/Scene.tsx`: `<EffectComposer multisampling={4} frameBufferType={HalfFloatType}>` with
    `<Bloom mipmapBlur>` + `<Vignette>` (darkness 0 when toggled off, to avoid conditional effect
    children). leva folders bloom + vignette. v3 prop note: use `enableNormalPass` (off by
    default), there is no `disableNormalPass`.
  - Verified: core glows softly, particles glow as steel-blue points, colors correct, 60fps,
    ~19 draw calls (bloom mipmap passes), console clean.
- Step 5:
  - `lib/useHeroPointer.ts`: single window pointermove listener, gated to phase === 'hero',
    writes a normalized (-1..1, y-up) pointer to the store; resets to (0,0) off-hero. Called once
    in App.
  - `lib/constants.ts`: CURSOR (lerp 0.05, clampX 1.2, clampY 0.8).
  - `three/Scene.tsx`: OrbSystem group position eases toward the clamped mouse offset each frame
    (mouse read via getState()). influence = reducedMotion ? 0 : 1 - heroProgress, so it
    auto-fades when Step 8 drives heroProgress and is off under reduced motion (Step 13).
    Frame-rate-independent easing. leva 'cursor' folder (lerp/clampX/clampY).
  - Verified by dispatching pointermove to opposite corners: orb trails the cursor with lag in
    both directions, particles follow, clamp keeps it on-screen and off the name. 60fps.
- Step 6 (all sections as static 2D content; NO scroll choreography/parallax yet):
  - `lib/assets.ts`: non-project asset paths + LINKS (email/github/linkedin/resume) + MEDIA_READY
    flag (false). `projects/projectsData.ts`: the 4 projects, copy VERBATIM from docs/02.
  - `shared/icons.tsx`: GitHub + LinkedIn marks. `nav/Nav`: wordmark + work/about/contact +
    social icons (anchor links for now). `hero/Hero`: name + tagline over orb + radial
    contrast-floor gradient + "scroll" affordance. `interlude/Interlude`, `contact/Contact`.
  - `about/About` + `about/TiltPhoto`: text-left/photo-right; cursor tilt + blue-duotone->colour
    on hover; 4:5 placeholder until MEDIA_READY.
  - `projects/Projects` + `ProjectCard` + `ProjectExpanded`: faint giant PROJECTS word, 2-col
    staggered cards, hover lift+scale + border->accent, overlay expanded view (media + full
    description + Geist Mono tech tags; close via X / click-outside / Escape; scroll-locked).
  - Verified full page top-to-bottom + card open/close. Real copy verbatim; all media placeholder.
- Step 7 (Lenis + GSAP ScrollTrigger + scroll progress + Reveal):
  - `lib/lenis.ts` useSmoothScroll(): Lenis (duration 1.1, autoRaf false) driven by gsap.ticker;
    ScrollTrigger.update + scrollProgress written each scroll frame; heroProgress from a scrubbed
    #hero trigger; phase from #interlude/#about/#projects start triggers (onEnter/onLeaveBack),
    DOM-position based (NOT fixed %). Module `lenis` handle exported. DEV: exposes window.scrollStore
    + window.lenis and console-logs phase changes.
  - `shared/Reveal.tsx`: useGSAP fade+slide-up on enter (once); optional `stagger` reveals direct
    children in sequence; opacity-only under prefers-reduced-motion. Applied to interlude, About
    (paragraphs stagger + photo), Projects (title + each card), Contact (staggered). Hero is NOT
    wrapped (its fade-in is the Step 11 load reveal).
  - `nav/Nav`: visible only near top (scrollY < 40), hides on scroll, reappears at top; links
    smooth-scroll via lenis.scrollTo. `ProjectExpanded`: scroll lock now lenis.stop()/start().
  - leva panel moved to top-center (fill + flat in a fixed wrapper) so it clears nav + socials.
  - Verified: nav "about" click lands exactly on About (scrollY 1478, phase 'about'); nav hides on
    scroll; reveals animate; phase chain hero->interlude->about->past; heroProgress 0..1.
  - Phase trigger thresholds ('top 60/70%') are approximate placeholders; tuned in leva in Step 8.
- Step 8 (orb scroll choreography):
  - store: interludeProgress + driftProgress. lib/constants: CHOREOGRAPHY + SHED.
  - `three/useOrbChoreography.ts`: per-frame group driver from the store - faded cursor offset
    (x -> 0 as hero exits), upward drift (driftProgress * driftDistance), and a scale pulse +
    rotation slow-down at the interlude beat (beat envelope on interludeProgress). getState only.
  - `three/Scene.tsx`: OrbSystem uses the hook; Canvas frameloop = phase==='past' ? 'never' :
    'always' (stops rendering once the orb is gone; resumes on scroll-up into About).
  - `lib/lenis.ts`: #hero scrub -> heroProgress; #interlude PINNED (start top top, end +=
    interludePinVh*vh, scrub, anticipatePin, invalidateOnRefresh) -> interludeProgress + the
    "harder to scroll" dwell (Jacob's request); #about scrub -> driftProgress + about<->past phase.
  - `OrbParticles`: per-particle release threshold; once driftProgress passes it the particle
    drifts up + outward and fades (instanceColor), restoring on scroll-up.
  - Verified via store + screenshots: interlude beat (orb centered + pulse over the line; pin adds
    ~665px), mid-About drift + shedding, Projects = orb gone / phase past.
- Refinements after Step 8 (Jacob's requests), before Step 9:
  - Instagram in nav (icon, next to GitHub/LinkedIn) + footer (text); "resume" link in the nav,
    left of work (opens /resume.pdf). PROJECTS bg word 2.5% -> 5% opacity.
  - Core orb is now 3D: directional view-space shading in coreShader (lit side / shadow side) +
    CORE.emissive 1.6 -> 1.3 so the form reads instead of clipping to a flat white disc.
  - Orb lifts above the interlude text during the beat (CHOREOGRAPHY.interludeLift) so the
    pulse/zoom is not on top of "Here's some of it." ScrollTrigger re-refreshes on
    document.fonts.ready (interlude-pin robustness: it can mis-measure if scrolled before the
    refresh settles on load).
  - ~30% of particles are blue-violet (PARTICLES.purpleFraction / purpleHue*), rest steel-blue;
    leva controls added. This intentionally overrides the docs' blue-only rule per Jacob.
  - leva panel: top-center at the very top, narrowed to w-64; nav is now full-width (no max-w-6xl)
    so its wordmark/links/icons sit at the screen edges, clear of the panel.
  - (later) Nav now FADES out on scroll (transition-opacity 0.5s) instead of snapping. The dev leva
    panel is `three/DevPanel.tsx`: 360px wide (PANEL_WIDTH) so control labels aren't truncated to
    "lum..."/"pur...", draggable handle + a `.dev-scroll` area whose max-height TRACKS the drag
    position (caps ~82vh) so it always stays on-screen and scrolls internally, around
    `<Leva fill collapsed theme>` (brighter labels + 12px font). CLOSED by default and closable via
    leva's own title-bar toggle (leva stays mounted, so it measures right and doesn't spawn a stray
    default panel). ALL leva folders start collapsed (`useControls(name, schema, { collapsed: true })`).
    (Jacob feedback: labels were unreadable at 256px + the fixed max-h could run off-screen - fixed.)
  - Interlude motion (final): the orb arcs CLOCKWISE around the centered text - starts above it,
    swings through the right, ends below it at horizontal center; then the About drift lifts it
    from there up and off. Smoothstep-eased (no snappy start). CHOREOGRAPHY.interludeRadius +
    positionLerp 0.05 + driftDistance 8 (it starts the drift from below the text now).
  - `shared/BackgroundWord` extracted; About ("ABOUT") + Contact ("CONTACT") now have the faint
    giant background word like Projects. About's is subtler (behind the text column) - reposition
    if Jacob wants it more prominent.
- Step 11 (loading screen + hero entrance):
  - `loading/LoadingScreen.tsx`: full-viewport black, z-[100], on top in App and self-unmounting.
    `/jt-logo.png` (the JT monogram, optimized to 600px/31K) centered + a thin WHITE progress line
    (Jacob's call, overrides docs/06's accent). Behind it: the SAME ambient `<Starfield>` as the page
    (seeded -> identical positions + twinkle phase, so the field persists through the fade), plus
    white shooting-star trails (CSS `.shooting-star` + `@keyframes shooting-star`: a short
    white->transparent gradient streak, rotate(45deg)+translateX sweep, 7 spans). Progress crawls to
    92% then completes on REAL readiness: `document.fonts.ready` + (`store.canvasReady` || lowPower) +
    a 1.8s minimum (MIN_DURATION). On complete: crossfade out (FADE_MS 1200ms) then unmount,
    `setLoaded(true)`, scroll reset to top. Logo sits at z-10 above the starfield.
  - `store.canvasReady` + `setCanvasReady` added; set from the `<Canvas onCreated>` in Scene (the
    orb's first-frame / GL-ready signal the loader waits on).
  - Scroll locked while loading via `documentElement.style.overflow='hidden'` (restored on
    complete + on unmount; lenis.scrollTo(0, immediate) on complete). Reliable regardless of when
    lenis inits (its handle is null at the loader's mount, child-before-parent effect order).
  - `hero/Hero.tsx`: name, tagline, scroll affordance now fade + rise in a cascade (delay-0/200/500)
    keyed on `store.isLoaded`, landing as the loader fades and the orb appears behind them.
  - Verified (dev :5175, font-stall initScript to hold the loader for a screenshot, then a clean
    reload): logo + stars + progress render; full reveal works; isLoaded/canvasReady true, phase
    'hero', html overflow reset to ''; console clean (only the benign THREE.Clock deprecation warn).

- Jacob refinement (after Step 11): ambient space backdrop behind the whole site, two fixed
  full-viewport layers in front of the canvas (it's effectively opaque, so a layer behind it
  wouldn't show) and below grain/content; the few elements over the bright orb self-mask.
  - `shared/Starfield.tsx` (z-[5]): seeded 48 small white stars, mostly 1px, low opacity with depth
    variation + soft box-shadow glow; ~1/3 breathe slowly (`.star-twinkle`, off under reduced
    motion). Tunables: STAR_COUNT, STAR_SEED, opacity range, twinkle fraction/speed.
  - `shared/Planets.tsx` (z-[4], behind the stars): 3 small (12-24px) dim distant planets, soft CSS
    radial-gradient spheres lit upper-left with a faint glow (`.planet` + `.planet-slate/-cool/-accent`
    in index.css; near-monochrome + one faint accent-tinted world). Hand-placed (not seeded) toward
    edges/corners, clear of the orb, hero name, and nav. Each drifts on a slow circular orbit around
    its spot (`planet-drift`, ~30-45s/orbit, ~6-11px/s) - gentle but visible; off under reduced motion.
    Tunables: the PLANETS array (pos/size/palette/orbit/duration) + the palette gradients/glow.
    (First pass was too big / too many / not glowing / drift imperceptible - Jacob feedback, fixed.)
  - Both kept deliberately subtle per docs/09 (no generic twinkly starfield); support the
    orb-in-space feel without competing with it.
- MOON / PLANET LIMB: PARKED + REMOVED (`13684db`). Tried twice and Jacob didn't like either, wants
  to revisit later. v1 = bright full-width cratered ground band below Contact ("looks really bad").
  v2 = a subtle dark rotating planet-limb dome inside the Contact section (`1a62b1a`: MoonSurface.tsx
  + a 7KB albedo webp + `.moon-rotate` CSS) - still "looks bad, come back to it". Both fully removed
  (no dead code/assets). To revisit, restore from git (v2 is the better base, commit `1a62b1a`).
- Horizontal-scrollbar fix (`a991122`): `overflow-x: clip` on html (index.css base). Full-bleed
  fixed layers + the GSAP pin-spacer round up to full viewport width incl. the scrollbar gutter,
  leaving a ~15px h-scroll. clip (not hidden) doesn't create a scroll container, so vertical scroll
  / Lenis stay untouched. Diagnose with innerHeight - clientHeight (NOT scrollWidth, which still
  reports clipped overflow and misled the first pass).
- Step 12 (mobile / low-power fallback, `ee6a337`):
  - `lib/gpuTier.ts` detectLowPower(): max-width 768px OR no-WebGL, evaluated once; seeds
    store.lowPower at store creation (right before first render + before lenis sets up triggers).
  - App: `{!lowPower && <Scene />}` - no canvas on mobile. Planets + Starfield (cheap CSS) stay.
  - `hero/Hero.tsx`: when lowPower, a static CSS glowing-orb disc behind the name (top 42%, clamp
    220-340px, blue-white radial gradient + soft glow), fades in on isLoaded. Swap to an
    `<img src={ASSETS.orbStill}>` once Jacob exports a real still.
  - `lib/lenis.ts`: choreography triggers (hero scrub, interlude PIN, about scrub) only created
    when !lowPower; Lenis + ScrollTrigger.update stay wired so scrollProgress + <Reveal> still work.
  - `shared/Parallax.tsx` + `lib/useHeroPointer.ts`: no-op under lowPower.
  - `loading/LoadingScreen.tsx`: readiness is `fontsReady && (lowPower || canvasReady) && minDur` -
    without the lowPower branch the loader hangs forever on mobile (no canvas to fire onCreated).
  - Verified at a phone viewport: lowPower true, 0 canvases, 0 pin-spacers, no h-scroll, loads at
    top, reveals fire on scroll, hero/about/projects/contact render single-column. Desktop
    re-checked: canvas + interlude pin + phase advance all intact.
- Step 13 (reduced motion + a11y floor, `bbe44d5`):
  - `gpuTier.detectReducedMotion()` seeds `store.reducedMotion` synchronously (flash-free);
    `lib/useReducedMotion.ts` keeps it live (OS-toggle). Called in App.
  - Orb static under reduced motion: `useOrbChoreography` skips the idle spin; `Orb.tsx` freezes
    uTime + breathing; `OrbParticles` freezes the orbit (time=0). `useHeroPointer` no-ops.
  - `lenis.ts` is now 3-way: lowPower -> no triggers; reducedMotion -> ONE trigger that toggles
    `opacity-0` on `#orb-canvas-layer` (Scene's canvas wrapper, `transition-opacity duration-700`)
    as #interlude enters, so the static orb fades out leaving the hero (opacity only); else the
    full choreography. Reveal/Parallax/ScrollIndicator already handled reduced motion.
  - LoadingScreen drops the shooting stars under reduced motion.
  - a11y: `:focus-visible { outline: 2px solid accent-hi }` in index.css base (verified Tab ->
    rgb(107,176,220)); canvas wrapper aria-hidden (grain/starfield/planets already were);
    ProjectExpanded focuses the close button on open + returns focus on close (already a labelled
    modal w/ Escape + scroll lock).
  - Contrast: `--color-text-mute` #6D6E71 -> #797B80 (measured 4.93:1 vs the near-black bg; was
    ~4.1:1, failed AA for normal-size text like the tagline). Deviation from docs/01 - see HEADS-UP.
  - Verified via a matchMedia-stub initScript: reducedMotion true -> static orb, 0 pin-spacers,
    orb layer opacity 0 past the hero, About reveals opacity 1 + no parallax transform; normal mode
    unaffected (pin + phase advance intact); keyboard focus ring is the accent.
- Step 14 (SEO + meta, `6a623bf`):
  - `index.html`: `<title>Jacob Tam`, meta description = the tagline VERBATIM (docs/02 - no invented
    copy), author, `theme-color #000102`, canonical `https://jacobtam.me/`. Open Graph (type, site_name,
    title, description, url, image 1200x630 + dims + alt) + Twitter `summary_large_image` for LinkedIn.
    Person JSON-LD (name, url, email, jobTitle, alumniOf Queen's; `sameAs` omitted - social URLs are
    still placeholders).
  - Assets generated from `public/jt-logo.png` via PIL (a one-off script, not committed):
    `favicon.ico` (16/32/48), `favicon-32.png`, `apple-touch-icon.png` (180), `og-image.png`
    (1200x630: logo on #000102 + a soft blue radial glow). Deleted the purple Vite scaffold
    `favicon.svg`. Analytics drop-in spot (App.tsx comment) left untouched per docs/09.
  - Absolute OG/canonical URLs hardcode `https://jacobtam.me` - update if the deploy domain differs.
  - Verified: head tags present + correct, JSON-LD parses, og/favicon/apple/ico all serve 200.

## Decisions made this session (not in docs)
- **Tailwind v4** (not v3): wired via `@tailwindcss/vite`, no JS config; tokens live in
  `@theme` in `index.css`. v4's CSS-variable model matches the "tokens as CSS variables"
  intent, and its default spacing scale already yields 4/8/12/16/24/32/48/64/96/128/192px.
- **Fonts via `@fontsource-variable/*`** (variable, self-hosted through npm) rather than the
  Next-oriented `geist` package — correct fit for Vite, still self-hosted (no CDN).
- **`/Assets/` gitignored** (146MB raw stash, 114MB is one video). Processed media goes in
  `/public/media/`. Anchored as `/Assets/` so it doesn't also catch `src/assets/` on
  case-insensitive macOS.
- Grain: SVG turbulence data-URI at 4% opacity (mid of the 3-5% spec range). Tunable.
- Z-layering convention: canvas `z-0`, grain `z-10`, content `z-20`, nav `z-30`.
- Particles use MeshBasicMaterial (unlit) + scene fog for depth + an HDR brightness gain for
  bloom eligibility. The spec's "lit by the core" point light is included but currently inert
  (the unlit + emissive look matches the glowing-points reference better). Revisit only if needed.
- Core color management: coreShader's tonemapping + colorspace chunks render correctly both
  standalone (Step 3) and through the composer (Step 4): the colorspace chunk no-ops on the
  composer's linear intermediate target, and the composer's OutputPass does the final sRGB.
  Verified at Step 4, left as-is.
- leva + r3f-perf currently ship in the bundle (only their UI is DEV-gated). Stripping them from
  the prod bundle is deferred to the Step 15 performance pass, per the build order.
- Step 3 correction (made during the Step 5 review): particle distribution rebuilt so each plane
  is a clean tilted RING (shared base radius + rigid per-plane angular speed + even phase spacing)
  rather than a random per-particle scatter. The first pass read as the "fuzzy cloud" docs/04 C4
  warns against and looked flat; concentric tilted rings read as a 3D Bohr atom. The strongest 3D
  cue still arrives with the Step 8 scroll motion (orb drifting up past the viewer).
- Nav has NO left wordmark/logo anymore (Jacob removed "Jacob Tam" from the top-left, `d73b461`).
  Nav is right-aligned only (justify-end): resume / work / about / contact + the three social icons.
  The loading screen still uses the real `/jt-logo.png` monogram (the only place the JT logo lives).
- MEDIA_READY (lib/assets.ts) gates ALL real media (project cards + About photo) behind one flag;
  flip to true once trimmed/compressed files are in /public/media. Can split per-asset if needed.
- (Resolved in Step 8) The orb no longer floats behind every section: it drifts off by the end
  of About and the canvas frameloop goes 'never' for Projects/Contact (resumes on scroll-up).
- Bloom-bump at the interlude beat is DEFERRED: passing a ref to @react-three/postprocessing
  <Bloom> crashes its reconciler with a circular-structure-to-JSON error, so the pulse is
  scale-only. Revisit with a non-ref method if the bloom bump is wanted.
- Choreography is now live-tunable via a dev leva 'choreography' folder (interludeRadius,
  driftDistance, positionLerp, pulseAmount, rotationStill, pinVh). Defaults in CHOREOGRAPHY; the
  pin length flows through lib/lenis.ts setInterludePin() (re-refreshes ScrollTrigger). Whatever
  Jacob lands on must be baked back into CHOREOGRAPHY. SHED params remain constants (not leva yet).

## Tuned values to eventually move into `src/lib/constants.ts`
- constants.ts now exists with orb defaults. leva seeds FROM these but does not write back, so
  whatever Jacob lands on in the panel must be copied back into the CORE / PARTICLES / CAMERA /
  FOG / GROUP / LIGHTS objects by hand. Re-bake again after Step 4 bloom tuning.

## Blocked on Jacob / owed assets (tracked in ASSETS.md)
- Taxi highlight video, Hyperloop pod photo, and `resume.pdf` are NOT in `Assets/` yet.
- Need a pick for the About photo (4 `.jpeg` candidates in `Assets/`).
- Purpose of `Gemini_Generated_Image...png` and the two screenshots is unclear.
- All current visuals are placeholders by Jacob's instruction even though real files exist.
- Real GitHub + LinkedIn + Instagram profile URLs (placeholders in lib/assets.ts point to site
  roots so they never 404). Email (jotam916@gmail.com) is known and wired.

## Notes
- leva must stay gated behind `import.meta.env.DEV` (Step 3 onward).
- r3f-perf available in dev (Step 3 onward).
- Single scroll source = Lenis + GSAP ScrollTrigger (Step 7). No drei ScrollControls.
