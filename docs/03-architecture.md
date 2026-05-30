# 03 — Architecture

## Project structure

Feature-folder organization. Group by section/feature, not by file type.

```
src/
  main.tsx
  App.tsx
  index.css                      # Tailwind entry + CSS variables + grain overlay
  store/
    useScrollStore.ts            # Zustand: scrollProgress, phase, mouse, isLoaded
  lib/
    lenis.ts                     # Lenis init + GSAP ScrollTrigger sync
    constants.ts                 # phase thresholds, tuned magic numbers
    gpuTier.ts                   # mobile/low-power detection for fallback
  components/
    loading/
      LoadingScreen.tsx
    nav/
      Nav.tsx
    hero/
      Hero.tsx                   # name + tagline overlay
    interlude/
      Interlude.tsx              # "Here's some of it."
    about/
      About.tsx
      TiltPhoto.tsx              # cursor-tilt + color-transition photo
    projects/
      Projects.tsx
      ProjectCard.tsx
      ProjectExpanded.tsx        # overlay-style expanded view
      ScrollIndicator.tsx        # sui.io-style vertical progress marker
      projectsData.ts            # the 4 projects as typed data
    contact/
      Contact.tsx
    three/
      Scene.tsx                  # the persistent <Canvas> + EffectComposer
      Orb.tsx                    # core sphere + group
      OrbParticles.tsx           # instanced orbiting particles
      useOrbChoreography.ts      # reads scroll store, drives orb each frame
    shared/
      GrainOverlay.tsx
      Reveal.tsx                 # wrapper for fade/slide-in-on-enter
      Parallax.tsx               # wrapper for scroll-speed parallax
  assets/                        # or use /public for large media
public/
  fonts/                         # self-hosted Geist woff2
  media/                         # project videos, images, photo, frames
  resume.pdf
```

## State management

**Zustand** holds the small set of cross-component state that the 3D scene, parallax,
and scroll indicator all read:

```ts
interface ScrollState {
  scrollProgress: number;   // 0..1 across the whole page
  heroProgress: number;     // 0..1 within the hero (for cursor-follow fade-out)
  phase: 'hero' | 'interlude' | 'about' | 'past';  // orb lifecycle phase
  mouse: { x: number; y: number };  // normalized -1..1, hero cursor follow
  isLoaded: boolean;        // loading screen done
  reducedMotion: boolean;
  lowPower: boolean;        // mobile / weak GPU → 3D fallback
}
```

- The Lenis RAF loop updates `scrollProgress` (and derived values) once per frame.
- A single `mousemove` listener (active in hero phase only) updates `mouse`.
- R3F components read from the store inside `useFrame` (do NOT subscribe React-reactively
  to high-frequency values inside the canvas; read `useScrollStore.getState()` in the
  frame loop to avoid re-renders).

Everything else (which project is expanded, nav visibility) is local component state or
small dedicated stores. Don't over-centralize.

## Scroll + Lenis + GSAP integration

ONE source of truth for scroll. Lenis drives everything; GSAP ScrollTrigger is wired into
Lenis so they don't desync.

```ts
// lib/lenis.ts (shape, not final)
const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

Do NOT also use drei's `<ScrollControls>`. The page has heavy 2D content between 3D
moments; real page scroll + Lenis + ScrollTrigger is the correct pattern here.

## The 3D canvas

ONE persistent `<Canvas>` fixed to the viewport, sitting behind the content
(`position: fixed; inset: 0; z-index: 0; pointer-events: none` so it never eats clicks).
Content scrolls above it. The orb lives in this canvas for its whole lifecycle (hero →
interlude → about → gone). Once the orb has fully exited (phase `past`), set the canvas
`frameloop` to `'never'` (or unmount the heavy contents) to stop rendering and free the GPU
for the rest of the page.

## Performance budgets (enforce these)

- Hero/orb scene: target 60fps desktop. Particle count ~50 (sparse, per spec) keeps this easy.
- Use **instancing** for the orbiting particles (one draw call), never 50 individual meshes.
- Total initial JS payload: keep reasonable. R3F + drei + postprocessing is ~500KB gzipped;
  that's the budget, don't pile on more 3D libs.
- Project videos: card loops must be short (~20s) and compressed. Lazy-load videos; only
  play the one(s) in/near viewport. Never autoplay all four at once.
- Images: serve compressed (WebP where possible), sized to display dimensions.
- Run with `r3f-perf` in dev to watch FPS, draw calls, GPU memory.
- Once orb exits, stop rendering the canvas (see above).

## Mobile / low-power fallback

Detect with a media query (`max-width: 768px`) and/or a GPU-tier check (`detect-gpu`).
On mobile/low-power:
- Do NOT render the 3D canvas at all. Show a **static hero image** (a nice still of the
  orb, exported from the desktop scene) behind the name/tagline.
- Disable all scroll choreography and parallax. Normal native-ish scroll.
- Same content, same sections, just without the 3D and motion. Everything must remain
  readable and usable.

## Conventions

- TypeScript throughout. Type the project data, the store, and component props.
- Modern React: function components, hooks. No class components.
- Fully expanded, readable code. Self-documenting names. Minimal comments (only for
  genuinely non-obvious logic like the orb choreography math or the Lenis/ScrollTrigger wiring).
- Tailwind for layout/styling; CSS variables for the palette tokens. Avoid inline magic
  numbers — pull phase thresholds and tuned values from `lib/constants.ts`.
- leva panels are DEV ONLY. Gate them behind `import.meta.env.DEV` so they never ship.

## Analytics (later, but make it easy)

Jacob will add analytics later. Structure so it's a one-line drop-in: leave a clear spot
in `App.tsx` (a comment marker) where a Vercel Analytics `<Analytics />` or similar can be
added without refactoring. Do not add it now.