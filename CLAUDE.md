# CLAUDE.md — Jacob Tam Portfolio

This is the master context file. Read this first, then read the `docs/` files as needed.
Everything in `docs/` is authoritative. If something here conflicts with a later
instruction from Jacob in the session, follow Jacob.

## What this is

A personal portfolio site for Jacob Tam, a fourth-year electrical engineering student
at Queen's University and varsity tennis player. The site has a signature 3D element
(a glowing orb with orbiting particles) that follows the cursor in the hero and then
drifts up and off the screen as the user scrolls, plus scroll-driven animation and
parallax throughout. Dark, sharp, refined aesthetic with a single blue accent.

Primary goal: a memorable, polished personal site that impresses people who find Jacob
through LinkedIn (recruiters and otherwise) and proves he can build something this
ambitious. Secondary goal: it's a fun build for himself.

## Hard deadline

Targeting a ship date of **June 3, 2026**. Jacob is building this in evening sessions of
~2 hours. Scope discipline matters. When in doubt, ship the simpler thing that looks
great over the complex thing that might break. Do not add features beyond what's
specified in these docs.

## Tech stack (already chosen, do not substitute)

- Vite + React + TypeScript
- Tailwind CSS
- React Three Fiber (`@react-three/fiber`) + drei (`@react-three/drei`) + postprocessing (`@react-three/postprocessing`) for the 3D orb
- GSAP + ScrollTrigger for scroll-driven animation
- Lenis for smooth scroll
- Zustand for shared cross-component state (scroll progress, phase, mouse)
- leva for live tuning of 3D/animation values during development (dev only)
- Geist + Geist Mono for typography

## The docs

- `docs/01-design-system.md` — palette, typography, spacing, radius, texture, motion principles
- `docs/02-content.md` — every word on the site, locked. Do not invent or paraphrase copy.
- `docs/03-architecture.md` — file structure, state, conventions, performance budgets
- `docs/04-3d-spec.md` — the orb scene fully specified (geometry, materials, particles, bloom)
- `docs/05-scroll-spec.md` — orb scroll choreography, parallax system, scroll indicator
- `docs/06-sections.md` — each section's layout, behavior, and interactions
- `docs/07-references.md` — reference sites and the specific thing to take from each
- `docs/08-build-order.md` — the exact build sequence with checkpoints. FOLLOW THIS ORDER.
- `docs/09-non-goals.md` — things to NOT do, traps to avoid

## How to work with Jacob

- **Build order is fixed.** Follow `docs/08-build-order.md` step by step. Do not jump ahead.
  After each step, stop and show the result so Jacob can review before you continue.
- **Ambiguous structural decisions:** stop and ask ONE quick question. Cosmetic choices:
  make a call, state the assumption in one line, move on. (Don't ask about cosmetic things.)
- **Code style:** modern, idiomatic, fully expanded and readable. No compressed/minified
  style. Self-documenting names. Comments only where logic is genuinely non-obvious.
  Be token-efficient where it doesn't compromise readability or the end result.
- **Commit after each completed step** with a descriptive message so any step can be rolled back.
- **Communication:** direct, no preamble, no sycophancy. Never use em dashes. Push back if
  something in the plan is technically wrong or will break.

## The single most important quality bar

Most AI-built sites look generic. This one must not. The orb, the motion, the typography,
and the restraint with the blue accent are what make it distinctive. When choosing between
"safe and generic" and "specific and intentional," always choose specific and intentional.
The frontend-design skill is installed and should guide aesthetic decisions.