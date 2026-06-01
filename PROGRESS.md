# PROGRESS.md — live build status

Single source of truth for resuming. Overwrite stale info; this is status, not a log.
Build sequence: `docs/08-build-order.md`. After each step: stop, show Jacob, commit.

## Current position
- **Step 11: loading screen DONE (`e2d2d9a`).** JT logo + blue progress + white shooting stars,
  completing on real readiness, fading out into the hero (name/tagline cascade in). Verified.
- **Step 10: scroll indicator DONE (`c6398e3`); clip-path expand DEFERRED** until the real smartbox
  video is in (it's the half that needs the clip; most cuttable per docs/08).
- Steps 0-11 complete (10b deferred); plus Jacob refinements, the removed Projects particle trace,
  and the nav-fade / dev-panel UX fixes. PROGRESS current.

## Next action on resume
- Jacob reviews the loading screen (reload localhost to see it; it only shows ~1.2s then fades).
- Otherwise on "continue": **Step 12 - Mobile / low-power fallback** (detect via store.lowPower:
  swap the 3D hero for a static still `orbStill` + keep layout; gate parallax/heavy motion). Then
  13 reduced-motion/a11y, 14 SEO/OG, 15 perf (strip leva + r3f-perf, lazy media, code-split three,
  Lighthouse), 16 easter egg + deploy.
- **Step 10b (clip-path expand) still DEFERRED** until the trimmed smartbox video is at
  `/public/media/smartbox.mp4` and MEDIA_READY is true. When ready: a pinned element expands from a
  small rounded rect to fullscreen via clip-path/scale as you scroll end-of-About -> Projects,
  settling into the first card; mobile/reduced shows the card normally. Mind the interplay with the
  interlude pin (ScrollTrigger order).

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
    panel is `three/DevPanel.tsx`: draggable handle + a max-h-[78vh] scrollable area (`.dev-scroll`
    visible scrollbar) around `<Leva fill collapsed>`. CLOSED by default and closable via leva's own
    title-bar toggle (leva stays mounted, so it measures right and doesn't spawn a stray default
    panel). ALL leva folders start collapsed (`useControls(name, schema, { collapsed: true })`), so
    opening shows a compact list of folder titles (~423px), not a wall of controls.
  - Interlude motion (final): the orb arcs CLOCKWISE around the centered text - starts above it,
    swings through the right, ends below it at horizontal center; then the About drift lifts it
    from there up and off. Smoothstep-eased (no snappy start). CHOREOGRAPHY.interludeRadius +
    positionLerp 0.05 + driftDistance 8 (it starts the drift from below the text now).
  - `shared/BackgroundWord` extracted; About ("ABOUT") + Contact ("CONTACT") now have the faint
    giant background word like Projects. About's is subtler (behind the text column) - reposition
    if Jacob wants it more prominent.
- Step 11 (loading screen + hero entrance):
  - `loading/LoadingScreen.tsx`: full-viewport black, z-[100], on top in App and self-unmounting.
    `/jt-logo.png` (the JT monogram, optimized to 600px/31K) centered + a thin blue progress line.
    White shooting-star trails behind it (CSS `.shooting-star` + `@keyframes shooting-star` in
    index.css: a short white->transparent gradient streak, rotate(45deg)+translateX sweep, 7 spans
    with staggered delays/durations). Progress crawls honestly to 92% then completes on REAL
    readiness: `document.fonts.ready` + `store.canvasReady` + a 1.2s minimum. On complete: fade out
    (700ms) then unmount, `setLoaded(true)`, scroll reset to top.
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
  - `shared/Planets.tsx` (z-[4], behind the stars): 5 small dim distant planets, soft CSS
    radial-gradient spheres lit upper-left (`.planet` + `.planet-slate/-cool/-accent` in index.css;
    near-monochrome + one faint accent-tinted world). Hand-placed (not seeded) toward edges/corners,
    clear of the orb, hero name, and nav. Each drifts on a long eased alternating path (`planet-drift`,
    ~110-196s/direction, minutes per cycle) so motion is barely-there; off under reduced motion.
    Tunables: the PLANETS array (pos/size/palette/dx/dy/duration) + the palette gradients.
  - Both kept deliberately subtle per docs/09 (no generic twinkly starfield); support the
    orb-in-space feel without competing with it.

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
- Nav left uses the "Jacob Tam" wordmark as the JT-logo placeholder (docs/02 lists "Jacob Tam"
  there; the JT logo replaces it when ready). The loading screen uses the real `/jt-logo.png`
  monogram (already in /public); the nav could adopt the same image later if Jacob wants.
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
