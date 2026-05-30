# 07 — References

Specific sites and the specific thing to take from each. The goal is to emulate these
particular mechanics/feels, NOT to clone any site wholesale. Adapt everything to the dark +
blue + Geist design system.

## Celestial Orb (2D code reference)
- **Source:** a 2D React canvas "Celestial Orb" hero (`21st.dev/community/components/s/hero`).
- **Take:** the cursor-follow mechanic and the look of a glowing core with blue points
  orbiting it. The way the center eases toward the mouse with a lag (lerp ~0.05) is exactly
  the hero feel we want.
- **Critical:** the reference is 2D canvas. We rebuild it in 3D (React Three Fiber) per
  `docs/04-3d-spec.md`. Do NOT port the 2D `getContext('2d')` / `fillRect`-trail code. Use
  real geometry, instancing, and bloom. The 2D code is a feeling reference only.

## zentry.com
- **Take:** the project/card interaction quality and the overall sense of polished,
  cinematic scroll-driven motion. The way media and cards feel alive and premium on hover
  and as they enter. Borrow the *quality bar* and the hover/reveal interaction feel, adapted
  to our restrained palette (zentry is more colorful; we stay near-monochrome + blue).

## wolverineworldwide.com
- **Take:** the fade-in text behavior. Clean, confident text that reveals as it enters the
  viewport. Use this as the model for the `<Reveal>` entrance feel on headings and paragraphs.

## sui.io
- **Take two things:**
  1. **Objects moving at different speeds than others on scroll** (parallax depth). This is
     the model for our parallax system (orb, faint PROJECTS text, about photo vs text, project
     media vs captions).
  2. **The center-screen scroll indicator component** — a vertical progress marker that acts
     as a custom scrollbar for a section. We adapt this for the Projects section (see the
     uploaded screenshot: a vertical line of dots with a moving highlighted square marker).
     See `docs/05-scroll-spec.md`.

## Nova (game-website, nova-game.netlify.app)
- **Take:** the clip-path expanding video pattern — a small framed element that expands to
  fullscreen as you scroll through it (their About section). We use this as the transition
  into the Projects section with the smartbox highlight video. Also a fine reference for the
  nav that hides on scroll. (Nova is GSAP-driven, not R3F; only borrow these 2D scroll
  patterns, not 3D.)

## Aesthetic feel anchors (general, not to copy)
- Linear / Vercel / Stripe: the sharp, dark, refined, confident baseline the whole site
  should feel like at rest. Restraint, generous space, strong type hierarchy.

## Anti-references
- None provided by Jacob. By default, avoid: generic SaaS landing templates, bootcamp-
  portfolio sameness, bento-grid AI-startup clichés, crypto/Web3 aesthetics, purple-gradient-
  on-white AI-slop, and anything that reads as a template. The frontend-design skill should
  steer away from these automatically; reinforce it.