# 01 — Design System

The visual language. All tokens go into the Tailwind config as CSS variables / theme
extensions so they're used consistently everywhere. Never hardcode a color or a font
size that isn't from this system.

## Aesthetic direction

Sharp, technical, refined. The reference points are Linear, Vercel, and Stripe in feel:
clean, confident, dark, restrained. Not playful, not maximalist, not brutalist. The
personality comes from the motion and the orb, not from loud visuals. Calm surface,
impressive when it moves.

## Color palette

A near-monochrome dark palette with ONE blue accent used sparingly.

```
--color-bg:        #000102   /* near-black, the page background */
--color-surface:   #060A0F   /* very slightly blue-tinted near-black, for cards */
--color-surface-2: #0B1118   /* one step lighter, for hover/elevated surfaces */
--color-text:      #FCFCFC   /* near-white, primary text */
--color-text-mute: #6D6E71   /* dim grey, secondary text, captions, labels */
--color-border:    #1A1E24   /* subtle border lines on cards */
--color-accent:    #4489B7   /* steel blue, THE accent */
--color-accent-hi: #6BB0DC   /* lighter blue, hover states + orb glow */
--color-accent-lo: #1F4666   /* deep blue, shadows + depth */
```

### Accent usage rule (strict)

The blue is RESERVED. Use it only for:
- Links and their hover states
- Interactive hover affordances (a hairline that lights up, a small glow)
- The orb and its particles (the orb is the main place blue lives)
- The scroll indicator active state
- Tech tag text or a single tech tag accent (subtle)

Do NOT use the blue for: large fills, gradient washes across sections, section
backgrounds, big buttons. The site reads as black-and-white with blue appearing only
where there's interaction or the orb. This restraint is the point.

## Typography

- **Geist** for everything (headings + body), used at varied weights.
- **Geist Mono** for: tech tags on project cards, the scroll indicator numerals,
  small labels, the footer colophon, any "engineer" accent moment.
- Load via the `geist` npm package or self-host the woff2 files. Do not use a CDN that
  blocks. Self-hosting is preferred for performance and reliability.

### Case
- Headings and the name: **Normal case** (e.g. "Jacob Tam", "Projects", "About").
  Not all-caps, not lowercase.
- Geist Mono labels MAY be uppercase with letter-spacing for the small-label look
  (e.g. tech tags, section index numbers like "01").

### Type scale (use these, don't improvise sizes)
Fluid where it helps, but anchor on these desktop values:
```
display (hero name):  clamp(3.5rem, 8vw, 7rem)   weight 600, tight tracking (-0.03em)
h2 (section titles):  clamp(2rem, 4vw, 3.25rem)  weight 600, tracking -0.02em
h3 (project titles):  1.5rem                      weight 600
body-lg (tagline):    1.25rem                     weight 400, mute-ish
body:                 1rem                         weight 400, line-height 1.6
small / labels:       0.8125rem                    Geist Mono, tracking 0.08em
```

## Spacing

8px base scale. Every margin and padding comes from this list:
```
4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192
```
Section vertical padding is generous: ~96 to 128px top/bottom on desktop, ~64px mobile.
White space is a feature. Do not crowd.

## Corner radius

Mixed, per the spec:
- UI elements, cards, the expanded project view: **soft rounded**, `rounded-xl` (12px)
  to `rounded-2xl` (16px).
- Sharp 90 degree corners are fine for full-bleed media and structural dividers.
- Avoid pill / very-rounded (24px+) shapes. Keeps it refined, not playful.

## Borders

- Project cards: a **small, subtle border** using `--color-border`, ~1px.
- On hover, the border can shift toward `--color-accent` at low opacity (a quiet glow).
- Section dividers: prefer spacing over visible lines. A hairline at very low opacity
  is acceptable if a divider is genuinely needed.

## Texture

A **subtle** film-grain noise overlay across the whole page. Keep it understated. Goal:
the dark background feels filmic rather than flat digital black. Implement as a fixed
full-viewport element with a tiled noise PNG or an SVG `feTurbulence` filter at very low
opacity (~3 to 5%), `pointer-events: none`, sitting above the background but below content.
It must not interfere with the 3D canvas readability. If it ever fights the orb's glow,
reduce opacity rather than removing it.

## Motion principles

- **Speed: cinematic.** Default transitions in the 600 to 1000ms range with ease-in-out
  for scroll-driven and entrance animations. UI micro-interactions (hover lift on a card)
  can be quicker (~300 to 400ms) so they feel responsive, but the overall feel is smooth
  and deliberate, not snappy/springy.
- **Scroll smoothing: medium.** Lenis configured between light and heavy. Suggested
  starting point: `duration: 1.1`, a gentle easing curve. Buttery but not so heavy it
  feels laggy. Tune in the build.
- **Entrances:** content fades and slides in subtly as it enters the viewport
  (translateY ~16 to 24px + opacity). Stagger related elements. The hero name and
  tagline fade in on load (white text appearing over the orb).
- **Reduced motion:** when `prefers-reduced-motion: reduce` is set, KEEP the orb rendering
  (static or very slow) but DISABLE the scroll choreography and parallax. Content appears
  without slide/fade transforms (opacity-only or instant). This is a hard requirement.

## Cursor

Default OS cursor. No custom cursor.

## Loading screen

Covers the entire viewport. Nothing else renders or is visible until loading completes.
Black background, the "JT" logo (Jacob is providing this) centered, with a thin progress
indicator in `--color-accent`. When complete, it fades out (cinematic, ~600 to 800ms) to
reveal the hero, and the hero name/tagline fade in as the orb becomes visible. See
`docs/06-sections.md` for the loading sequence detail.