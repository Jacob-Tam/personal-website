# 05 — Scroll Choreography & Parallax

How the orb behaves across the scroll, plus the parallax system and the custom scroll
indicator. All phase boundaries should reference DOM section positions (via ScrollTrigger
on each section), NOT hardcoded scroll percentages, so they survive content/height changes.
Expose the tuning values in leva during the build, then bake into `lib/constants.ts`.

## The orb lifecycle (the centerpiece motion)

The orb exists from the hero through the about section, then is gone. It is NOT a dramatic
fly-away; it's a gradual upward drift, like a real object the user descends past, while it
sheds particles along the way.

### Phase 1 — Hero
- Orb roughly centered (with the small mouse-driven offset, clamped, name stays readable).
- Core breathing, particles orbiting on their tilted planes, slow overall rotation of the group.
- **Cursor-follow active** (see 3D spec). Name + tagline fade in over it on load.

### Transition — Hero → Interlude
- As the user scrolls out of the hero, cursor-follow influence fades to zero.
- The orb begins moving toward **horizontal center** (settling x to 0 regardless of where
  the cursor left it).

### Phase 2 — Interlude ("Here's some of it.")
- A short full-height section between hero and about.
- The orb arrives here and **slows almost to a stop**, then **pulses once** (a brief scale
  + bloom bump), a deliberate "beat."
- The single line of text "Here's some of it." is centered, fading in.
- This is the orb's last intentional moment before it leaves.

### Phase 3 — Interlude → through About
- The orb **resumes**, now **drifting upward** (position.y increasing) as the user scrolls,
  like they're scrolling past it.
- **Particle shedding:** over this stretch, some orbiting particles detach and drift up and
  off the top of the screen, not returning. Implement as: a growing fraction of particles
  transition from "orbiting" to "released" (given an upward velocity + slight outward drift),
  fading as they exit the top. The shedding is gradual and tied to scroll progress, so by
  the time the user is moving through About, the orb has noticeably fewer particles and is
  riding higher on screen.
- The About content (photo + text) appears normally beneath/around this.

### Phase 4 — Orb gone
- By the **end of the About section**, the orb and its remaining particles have drifted
  fully off the top. The orb is gone.
- Set the canvas `frameloop` to `'never'` (or unmount heavy 3D contents) once fully exited,
  to stop rendering for the rest of the page (Projects, Contact). Re-enable only if the user
  scrolls back up into the orb's range.

### Summary of orb position over scroll
```
hero:        centered + cursor offset (clamped), full particle count
→ interlude: x→0, slows, single pulse
→ about:     drifts up (y increases), sheds particles progressively
end of about: fully exited top, frameloop off
projects on: no orb
```

## Parallax system (scroll-speed differences)

Jacob wants multiple elements moving at different speeds than the background, echoing the
sui.io reference and the orb. Use a reusable `<Parallax speed={...}>` wrapper (GSAP-driven,
reading the Lenis scroll) so it's consistent. Apply it intentionally, not randomly:

1. **Orb** — the master example (handled by the choreography above).
2. **Projects background word** — the large faint "PROJECTS" text behind the project cards
   scrolls noticeably slower than the cards (deep background layer).
3. **About photo vs text** — the photo and the text column scroll at slightly different
   speeds (photo a touch slower) for depth.
4. **Project media vs captions** — within a project card region, the media can scroll
   slightly slower than its title/tagline, giving a subtle depth shift as it passes.
5. Keep parallax subtle elsewhere. Restraint: a few well-chosen depth moments read as
   designed; parallax on everything reads as noise.

Disable all parallax under `prefers-reduced-motion` and on mobile/low-power.

## Custom scroll indicator (sui.io-style) — Projects section

Per the uploaded reference: a vertical indicator, roughly centered/anchored on screen
during the projects section, acting as a custom scrollbar/progress marker for that section.

- A vertical line of small dots (Geist Mono dots or small ticks) with a highlighted marker
  (a small filled square per the screenshot) that moves down the line as the user scrolls
  through the projects.
- It tracks scroll progress **within the projects section** specifically (0 at the first
  project entering, 1 at the last project leaving).
- The active marker uses the blue accent; inactive dots are muted/dim.
- Optionally each dot corresponds to a project (4 anchor points) and the marker snaps/eases
  toward the nearest as you scroll — but keep it simple first (continuous progress marker),
  add per-project anchoring only if time allows.
- Position: fixed/sticky during the projects section, on one side or center-anchored per the
  reference. It should appear when projects enter view and fade out when they leave.
- Hidden on mobile/low-power and under reduced-motion (or rendered static).

## Clip-path expanding video (transition into Projects)

The Nova-style effect: an element starts as a small rounded rectangle and expands to fill
the screen as the user scrolls through it.

- Use the **smartbox ~20s highlight video** as this element.
- As the user scrolls from the end of About into Projects, the smartbox video starts as a
  small framed rounded rectangle (centered) and **expands toward fullscreen** via animated
  `clip-path`/size while pinned, then **settles into being the first project** (the smartbox
  card) as the projects layout takes over.
- Technique: animate `clip-path: inset(...)` (or width/height + border-radius) from small to
  full while the video itself stays full-size underneath (crisper than scaling the video).
  ScrollTrigger with `pin: true`, `scrub`. Use `invalidateOnRefresh: true` for resize safety.
- This ties the orb's exit into the projects reveal: orb leaves the top, the smartbox video
  opens up, projects begin.
- Mobile/low-power: skip the pin+expand; show the smartbox card normally.

## Reveal-on-enter

Most content (section titles, paragraphs, cards) fades + slides up slightly as it enters the
viewport, via a reusable `<Reveal>` wrapper. Stagger related items. Cinematic timing
(~600 to 900ms, ease-out). Opacity-only / instant under reduced motion.

## Implementation notes
- All ScrollTriggers should be registered once and refreshed on resize. Pair with Lenis per
  the architecture doc so smoothing and triggers stay in sync.
- Read high-frequency scroll values in frame loops via `useScrollStore.getState()`, not via
  reactive subscriptions, to avoid React re-renders during scroll.
- Phase boundaries from section DOM positions (ScrollTrigger `trigger` per section), not
  fixed percentages.