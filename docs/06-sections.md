# 06 — Sections

Layout and behavior for each section, top to bottom. Copy is in `docs/02-content.md`
(use it verbatim). Motion details are in `docs/05-scroll-spec.md`.

## Vertical flow

```
1. Loading screen (covers everything, fades out when done)
2. Nav (top, hides on scroll)
3. Hero
4. Interlude — "Here's some of it."
5. About (orb still present, drifting up; gone by end of About)
6. Projects (no orb; faint "PROJECTS" bg text; scroll indicator; staggered cards)
7. Contact / Footer
```

## 1. Loading screen

- Covers the **entire viewport**. Nothing else renders or is visible until loading completes.
- Black background. The "JT" logo (Jacob provides) centered. A thin progress indicator in
  the blue accent (a slim bar or a percentage in Geist Mono).
- Tracks actual asset loading (fonts, the hero's first 3D frame readiness, critical media).
  Don't fake a fixed timer; reflect real readiness, with a sensible minimum (~800ms) so it
  doesn't flash.
- On complete: fade out (~600 to 800ms). As it clears, the hero is revealed and the name +
  tagline fade in while the orb becomes visible.

## 2. Nav

- Fixed at the top. Contents per content doc: "Jacob Tam" (or JT logo) left; work / about /
  contact center-or-right; GitHub + LinkedIn icons right.
- **Hides once the user starts scrolling** and does not reappear while scrolling down.
  Acceptable refinement: it may reappear if the user scrolls back to the very top. Keep it
  simple — the key requirement is it's gone during the experience, not floating over the orb
  choreography and content.
- Links smooth-scroll (via Lenis) to sections. Icons open new tabs.
- Subtle, refined. Small Geist text. Blue only on hover.

## 3. Hero

- Full viewport. The 3D orb (in the fixed canvas behind) is the visual; the name + tagline
  sit centered on top (`z` above the canvas).
- Composition: name centered, tagline beneath it, both **white**, **fading in on load**.
- Name uses the display scale (Geist, normal case, weight 600, tight tracking). Tagline uses
  body-lg, slightly muted.
- The orb follows the cursor here (hero phase only). Ensure the orb's clamp keeps the name
  readable at all times; if needed, a very subtle radial dark gradient behind the text
  guarantees contrast floor regardless of orb position.
- A small scroll affordance at the bottom (a thin line, a chevron, or a tiny "scroll" label
  in Geist Mono) is fine and on-brand. Keep it understated.

## 4. Interlude

- Short full-height section, near-black.
- One line centered: "Here's some of it." (Geist, h2-ish scale, normal case), fading in.
- This is where the orb slows and pulses once before resuming its upward drift (see scroll
  spec). The text and the orb beat should feel coordinated.

## 5. About

- Intentionally **short**. Two columns: **text left, photo right**.
- Text: the three short paragraphs from the content doc. They reveal (fade/slide up,
  staggered) as the section enters.
- Photo (TiltPhoto component): do BOTH effects Jacob approved:
  - **Color transition:** the photo is rendered in a subtle blue duotone / desaturated-with-
    blue-tint by default, transitioning to full color on hover (and/or as it scrolls fully
    into view). Smooth, ~500ms.
  - **Cursor tilt:** a subtle 3D tilt that responds to cursor position over the photo (small
    rotateX/rotateY, gentle, with a soft shadow). Think a restrained VanillaTilt — tasteful,
    not a toy.
- Parallax: photo scrolls slightly slower than the text column (depth).
- The orb is still present in the background during About, drifting upward and shedding
  particles; it should NOT clutter or reduce readability of this section. By the end of
  About it has exited the top.

## 6. Projects

- Section title "Projects" (h2). A very large, very faint "PROJECTS" word sits behind the
  cards as a deep background layer, scrolling slower than the content (parallax).
- **Transition in:** the clip-path expanding smartbox video (see scroll spec) opens the
  section, settling into the first project card.
- **Layout: 2-column staggered.** Cards are offset vertically from each other (masonry-ish
  stagger), not a rigid aligned grid. Four projects in the order in the content doc.
- **Custom scroll indicator** (sui.io-style vertical marker) appears anchored on screen
  during this section, tracking progress through the projects (see scroll spec).

### Project card
- Visual on the card:
  - Smartbox: ~20s highlight **video**.
  - Taxi: ~20s highlight **video**.
  - QHDT: ~20s highlight **video**.
  - Hyperloop: CAD render **image** (physical pod photo available as secondary, can appear
    in the expanded view).
- Default state: card with subtle border, video paused on a poster frame (or image).
- **Hover:** subtle **lift + scale**, and the **video starts playing** (muted, looping).
  Image cards (hyperloop) just lift + scale. Border hints toward blue on hover.
- Title (h3) + tagline visible on the card. Tech tags can be subtle on the card or revealed
  on expand — keep the card clean; tags primarily live in the expanded view.

### Project expanded (on click)
- **Overlay-style expansion** (NOT grid reflow — the staggered layout reflows badly).
  Clicking a card opens an expanded view: the card content scales/animates up into an
  overlay above the rest, with the background dimmed. A close affordance (click outside or
  an X) returns to the grid.
- Expanded view shows: the larger media (video with controls / the CAD render, with the pod
  photo as secondary for hyperloop), the title, the full **description**, and the **tech
  tags** (Geist Mono). This is where the "better description of the project and tech stack"
  lives.
- No external repo links on the cards (Jacob's GitHub is in the nav + footer instead).

## 7. Contact / Footer

- The closing section. Copy per content doc:
  - "Get in touch" heading
  - email (mailto)
  - github / linkedin / resume links
  - "© 2026 Jacob Tam. Made with too many Mango Loco Monsters."
- Calm, lots of space, on-brand. Blue only on link hovers.
- resume → `/resume.pdf` (current version now; Jacob updates later).