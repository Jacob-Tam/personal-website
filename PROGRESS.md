# PROGRESS.md — live build status

Single source of truth for resuming. Overwrite stale info; this is status, not a log.
Build sequence: `docs/08-build-order.md`. After each step: stop, show Jacob, commit.

## Current position
- **Step 5 (Hero cursor-follow): COMPLETE.** Awaiting Jacob's review at checkpoint.
- **Step 6 (All sections as static 2D content): NOT STARTED.**
- Steps 0-4 complete and committed (latest `cb5ced2`).

## Next action on resume
- Jacob reviews the cursor-follow (move the mouse in the hero; the orb trails it with a lag).
- On "continue": start **Step 6 - All sections as static 2D content** (the big layout step; NO
  scroll choreography/parallax yet, hover states OK). Use VERBATIM copy from docs/02. Build:
  - Nav: "Jacob Tam" / work / about / contact + GitHub + LinkedIn icons (hide-on-scroll is
    Step 7+; static for now). JT logo = text "JT" placeholder.
  - Hero overlay: name (display) + tagline (body-lg), white, centered over the orb; subtle
    radial dark gradient behind the text for contrast floor (docs/06); small mono scroll
    affordance at the bottom. Replaces the "01/HERO" stub.
  - Interlude: "Here's some of it." centered (h2-ish).
  - About: 3 paragraphs left (verbatim) + TiltPhoto right (blue duotone -> full colour on hover
    + cursor tilt). Placeholder portrait ~4:5.
  - Projects: title + faint giant "PROJECTS" bg word (static now); 2-col staggered cards (4, in
    docs/02 order) with placeholder media (poster+play for the 3 videos, gray block for
    hyperloop); hover lift+scale, border -> accent; click opens an OVERLAY-style expanded view
    (NOT grid reflow) with larger media + full description + Geist Mono tech tags + close.
  - Contact/footer: "Get in touch", mailto, github/linkedin/resume, colophon line.
  - Create `src/lib/assets.ts` (single source of non-project asset paths) and
    `projectsData.ts` (typed project data incl. media paths). Placeholders per ASSETS.md.
  - Commit WIP per section (big step).

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

## Tuned values to eventually move into `src/lib/constants.ts`
- constants.ts now exists with orb defaults. leva seeds FROM these but does not write back, so
  whatever Jacob lands on in the panel must be copied back into the CORE / PARTICLES / CAMERA /
  FOG / GROUP / LIGHTS objects by hand. Re-bake again after Step 4 bloom tuning.

## Blocked on Jacob / owed assets (tracked in ASSETS.md)
- Taxi highlight video, Hyperloop pod photo, and `resume.pdf` are NOT in `Assets/` yet.
- Need a pick for the About photo (4 `.jpeg` candidates in `Assets/`).
- Purpose of `Gemini_Generated_Image...png` and the two screenshots is unclear.
- All current visuals are placeholders by Jacob's instruction even though real files exist.

## Notes
- leva must stay gated behind `import.meta.env.DEV` (Step 3 onward).
- r3f-perf available in dev (Step 3 onward).
- Single scroll source = Lenis + GSAP ScrollTrigger (Step 7). No drei ScrollControls.
