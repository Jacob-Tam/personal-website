# 08 — Build Order

Follow this sequence. Do NOT jump ahead. After each step, STOP and show Jacob the result
before continuing. Commit after each completed step with a descriptive message so any step
can be rolled back. Build static and correct first; add motion and 3D in layers.

Rationale: catching a layout or architecture mistake in step 5 is cheap; catching it after
the scroll choreography is wired on top is expensive.

## Step 0 — Project bootstrap (likely already done)
- Vite + React + TS, dependencies installed (three, @react-three/fiber, @react-three/drei,
  @react-three/postprocessing, gsap, @gsap/react, lenis, zustand, leva, tailwind).
- Confirm dev server runs. `git init`, first commit.

## Step 1 — Tailwind config + design tokens
- Wire Tailwind. Put the palette from `docs/01-design-system.md` in as CSS variables +
  theme extensions. Self-host Geist + Geist Mono fonts. Set up the type scale and spacing
  scale as usable tokens.
- Add the grain overlay component (subtle, fixed, pointer-events none).
- Deliverable: a blank near-black page with the grain, fonts loaded, tokens available.
- CHECKPOINT.

## Step 2 — Layout shell (no content, no 3D, no motion)
- Build the feature-folder structure (`docs/03-architecture.md`).
- Stub every section as an empty full-height block in correct order: Nav, Hero, Interlude,
  About, Projects, Contact. Just boxes with section labels so the page scrolls top to bottom.
- Set up the Zustand store skeleton.
- Deliverable: a scrollable page with all sections present and in order, nothing styled yet.
- CHECKPOINT.

## Step 3 — Static 3D scene (orb standing still)
- Persistent fixed `<Canvas>` behind content. Core sphere (with the subtle-noise shader)
  + ~50 instanced orbiting particles on a few tilted planes. No scroll, no cursor yet.
  Slow idle rotation + core breathing only.
- Add leva (DEV only) exposing the tuning params from the 3D spec.
- Deliverable: a good-looking orb sitting in the hero area, tunable in leva.
- CHECKPOINT — Jacob tunes the look here. Spend real time. This is the signature element.

## Step 4 — Bloom + postprocessing
- Add EffectComposer + Bloom (subtle, per spec). Tune in leva against the real palette.
- Deliverable: the orb now glows correctly. Bake good values into constants.
- CHECKPOINT.

## Step 5 — Hero cursor-follow
- Single mousemove listener → normalized mouse in the store. Orb group lerps toward a
  clamped mouse-driven offset (hero only). Name stays readable.
- Deliverable: orb follows the cursor in the hero with an eased lag.
- CHECKPOINT.

## Step 6 — All sections as static 2D content
- Build Nav, Hero overlay (name + tagline), Interlude text, About (text + TiltPhoto with
  color transition + tilt), Projects (staggered cards with media, titles, taglines; expanded
  overlay view with description + tech tags), Contact/footer. Real copy from the content doc.
- No scroll choreography or parallax yet (static positions, hover states OK).
- Use placeholder media if Jacob's assets aren't all in yet, but wire the real structure.
- Deliverable: the entire site readable and correctly laid out, desktop. This is the moment
  to judge the whole page before motion goes on top.
- CHECKPOINT — review the full page end to end.

## Step 7 — Lenis + GSAP ScrollTrigger + scroll progress
- Wire Lenis, sync ScrollTrigger, populate `scrollProgress` / `heroProgress` / `phase` in
  the store from section DOM positions. Add the `<Reveal>` entrance wrapper and apply to
  headings/paragraphs/cards.
- Deliverable: smooth scroll; content reveals on enter; store values verified (log them).
- CHECKPOINT.

## Step 8 — Orb scroll choreography
- The full lifecycle: cursor-follow fades out on scroll → orb centers → interlude slow +
  single pulse → upward drift through About with progressive particle shedding → fully gone
  by end of About → frameloop off afterward. Tie boundaries to section triggers; tune in leva.
- Deliverable: the orb's complete journey works and feels coordinated with the interlude beat.
- CHECKPOINT — this is the second big tuning moment.

## Step 9 — Parallax system
- Reusable `<Parallax>` wrapper. Apply to: faint PROJECTS bg text (slow), About photo vs
  text, project media vs captions. Subtle. (Orb already handled.)
- Deliverable: depth on scroll in the intended places, restrained.
- CHECKPOINT.

## Step 10 — Projects scroll indicator + clip-path expand
- The sui.io-style vertical scroll indicator for the Projects section.
- The clip-path expanding smartbox video as the transition into Projects, settling into the
  first card. Pinned + scrubbed, resize-safe.
- Deliverable: projects section has its custom indicator and the cinematic open.
- CHECKPOINT.

## Step 11 — Loading screen + final hero entrance
- Full-viewport loading screen (JT logo + blue progress), tracking real asset readiness with
  a sensible minimum, fading out into the hero with the name/tagline fade-in and orb appearance.
- Deliverable: a complete first-load experience.
- CHECKPOINT.

## Step 12 — Mobile / low-power fallback
- Detect mobile/low-power. No 3D canvas → static hero image. Disable choreography + parallax.
  Same content, fully readable and usable. Verify on a real phone, not just devtools.
- Deliverable: a solid mobile experience.
- CHECKPOINT — test on an actual device.

## Step 13 — Reduced motion + accessibility floor
- `prefers-reduced-motion`: keep orb static/slow, disable choreography + parallax, opacity-
  only reveals. Keyboard nav works, alt text on images/media, sufficient contrast, focus
  states visible.
- Deliverable: respectful behavior for reduced-motion users; basic a11y holds.
- CHECKPOINT.

## Step 14 — SEO basics + meta
- Favicon, title, meta description, Open Graph card (for LinkedIn shares), basic structured
  metadata. Leave the marked spot for analytics (don't add it).
- CHECKPOINT.

## Step 15 — Performance pass
- r3f-perf check; ensure canvas stops rendering after orb exit; lazy-load project videos;
  compress/resize media; run Lighthouse. Target a good mobile score; fix the worst offenders.
- CHECKPOINT.

## Step 16 — Easter egg + polish + deploy
- Add the one easter egg (confirm choice with Jacob). Final timing/easing polish.
- Deploy to Vercel. Wire the jacobtam.me domain.
- Done.

## If time runs short before June 3
Cut in this order (least damage first): easter egg → clip-path expand (show smartbox card
normally) → parallax beyond the orb → scroll indicator. Protect, in order: the orb +
choreography, the content/projects, mobile fallback, loading screen. Never ship something
visibly broken; ship fewer, finished things.