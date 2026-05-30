# PROGRESS.md — live build status

Single source of truth for resuming. Overwrite stale info; this is status, not a log.
Build sequence: `docs/08-build-order.md`. After each step: stop, show Jacob, commit.

## Current position
- **Step 1 — Tailwind config + design tokens + fonts + grain overlay: COMPLETE (awaiting Jacob's review at checkpoint).**
- Step 0 (bootstrap) complete and committed.

## Next action on resume
- Jacob reviews the Step 1 checkpoint (near-black page, grain, Geist fonts, tokens).
- On "continue": start **Step 2 — Layout shell** (feature-folder structure; stub Nav, Hero,
  Interlude, About, Projects, Contact as empty full-height blocks in order; Zustand store
  skeleton `src/store/useScrollStore.ts`). No 3D, no motion, no real content yet.

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
- Z-layering convention: canvas `z-0`, grain `z-10`, content `z-20`.

## Tuned values to eventually move into `src/lib/constants.ts`
- (none yet — constants.ts is created in Step 3 for the orb params.)

## Blocked on Jacob / owed assets (tracked in ASSETS.md)
- Taxi highlight video, Hyperloop pod photo, and `resume.pdf` are NOT in `Assets/` yet.
- Need a pick for the About photo (4 `.jpeg` candidates in `Assets/`).
- Purpose of `Gemini_Generated_Image...png` and the two screenshots is unclear.
- All current visuals are placeholders by Jacob's instruction even though real files exist.

## Notes
- leva must stay gated behind `import.meta.env.DEV` (Step 3 onward).
- r3f-perf available in dev (Step 3 onward).
- Single scroll source = Lenis + GSAP ScrollTrigger (Step 7). No drei ScrollControls.
