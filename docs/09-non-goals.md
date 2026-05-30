# 09 — Non-Goals & Traps

Things to NOT do. Equally important as the spec. Re-read before adding anything not
explicitly requested.

## Scope non-goals (do not build these)
- No frame-scrubbed Kling video. It was considered and CUT for v1. Do not add it.
- No blog, writing section, or "thoughts" page.
- No skills/tech-stack badge wall (tech lives inside project cards only).
- No hobby/fun-facts section (personality is in the copy lines, not a section).
- No LevelUp project (cut for v1; may be added later — do not include now).
- No external repo links on project cards (GitHub lives in nav + footer only).
- No Spotify "now playing" (later, not this iteration).
- No analytics now (leave a one-line drop-in spot only).
- No contact form (a mailto link is the contact method).
- No light mode. The site is dark, period.
- No custom cursor.

## Design traps to avoid
- Do NOT overuse the blue accent. It is reserved (links, hover, orb, indicator active state).
  No big blue fills, no gradient washes across sections. Near-monochrome + blue is the look.
- Do NOT use generic/overused fonts (Inter, Roboto, Arial, Space Grotesk). Geist + Geist Mono
  only.
- Do NOT make the grain heavy. Subtle (~3-5%). If it fights the orb glow, reduce it.
- Do NOT crowd sections. Generous whitespace is intentional. About is deliberately SHORT.
- Do NOT make the orb a textured Earth or any recognizable object. Abstract glowing orb only.
- Do NOT let the orb obscure the hero name. Clamp its cursor range; guarantee text contrast.
- Avoid AI-slop layouts: centered-everything sameness, predictable card grids with no stagger,
  decorative gradients. This site must read as intentional and distinctive.

## Technical traps to avoid
- Do NOT use drei `<ScrollControls>`. Lenis + GSAP ScrollTrigger is the single scroll source.
- Do NOT use localStorage/sessionStorage or any browser storage. Not needed; avoid it.
- Do NOT create 50 individual particle meshes. Instance them (one draw call).
- Do NOT subscribe React-reactively to high-frequency scroll/mouse values inside the canvas.
  Read `useScrollStore.getState()` in the frame loop to avoid re-renders.
- Do NOT use the 2D canvas `fillRect` trail hack from the reference. Bloom + motion only.
- Do NOT autoplay all four project videos at once. Lazy-load; play only what's in view.
- Do NOT hardcode phase thresholds as fixed scroll percentages. Anchor to section DOM
  positions via ScrollTrigger so they survive content/height changes.
- Do NOT leave leva panels in the production build. Gate behind `import.meta.env.DEV`.
- Do NOT keep the 3D canvas rendering after the orb has exited. Set frameloop to 'never'.
- Do NOT ship the desktop 3D experience to mobile. Static hero image + no choreography there.

## Process traps to avoid
- Do NOT skip ahead in the build order or batch multiple steps without checkpoints.
- Do NOT add motion/3D before the static 2D layout is reviewed and approved (step 6).
- Do NOT invent or paraphrase copy. Use `docs/02-content.md` verbatim; ask if something's
  missing.
- Do NOT over-abstract. Feature folders, simple components. No premature design-system
  framework, no atomic-design ceremony, no state library beyond Zustand for the shared bits.
- Do NOT pad the codebase with comments. Comment only genuinely non-obvious logic.
- When genuinely ambiguous about a STRUCTURAL choice, ask ONE quick question. For cosmetic
  choices, make a call, note it in one line, move on. Don't stall on small things; don't
  guess on big ones.