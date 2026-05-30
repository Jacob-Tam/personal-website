# 04 — 3D Orb Spec

The signature element. A glowing central orb with smaller orbs/particles orbiting it,
inspired by the "Celestial Orb" 2D reference but rebuilt properly in 3D with React Three
Fiber. The 2D reference is for the FEELING and the cursor-follow mechanic only — do not
port the 2D canvas code. Build it natively in 3D.

## Reference

The look to match: a bright glowing core at center, with smaller glowing blue points
orbiting around it on rings, against pure black, with real bloom. See the uploaded
"Celestial Orb" screenshots. Ours is 3D: the orbits exist on tilted planes in real space,
particles parallax correctly with depth, and the glow is real bloom postprocessing (not a
2D shadowBlur hack).

## Scene setup

- `<Canvas>` persistent, fixed, behind content, `pointer-events: none`. See architecture doc.
- Camera: perspective, FOV ~50, positioned around `(0, 0, 6)`, looking at origin.
- Background: transparent (`gl={{ alpha: true }}`), so the page's near-black + grain show through.
- Lighting: a point light at the core position (white, intensity ~2, decay 2) so particles
  are lit by the core; a very low ambient (~0.1) so nothing goes fully black.

## The core

- A sphere, radius ~0.4, ~32 segments.
- **Surface treatment: subtle shader noise** (per spec C2). Not a flat white ball. Use a
  custom shader material (or a `MeshStandardMaterial` with emissive + a noise-displaced or
  fresnel-rim shader) giving a slow internal turbulence / energy feel. Keep it subtle —
  the core reads as a glowing white-blue light source with a hint of life inside, visible
  on close look but not busy.
- Emissive, bloom-eligible. Color: white core with a faint blue cast (lean toward
  `--color-accent-hi` in the glow rather than pure cyan).
- A slow pulsing scale (sin wave, amplitude ~0.02, period ~3s) so it breathes.

## The orbiting particles

- **Count: ~50** (sparse and elegant, per spec C3). Instanced mesh, ONE draw call.
- Each particle is a small sphere, radius varied ~0.015 to 0.04.
- Color: the blue range. HSL hue ~205 to 220 (lock to the steel-blue accent family; do
  NOT let it drift toward purple like the 2D reference's 200–260 range did). Lightness
  varied ~55 to 70 for life. Emissive / bloom-eligible.
- **Orbit pattern: deliberate few orbital planes** (per spec C4), like a stylized Bohr atom.
  Define ~3 to 5 distinct orbital planes at different tilts. Distribute the ~50 particles
  across these planes. This reads as designed and geometric, not a random fuzzy cloud.
- Each particle has: which plane it's on, its orbit radius (~1.2 to 2.6), its angular speed
  (slow, varied ~0.1 to 0.4 rad/s), and a phase offset.
- Per frame: advance each particle's angle, compute position on its (tilted) orbital plane,
  write the instance matrix. Use `delta` timing so speed is frame-rate independent.
- Depth cue: particles further from camera can be slightly dimmer/smaller (real perspective
  already helps; a subtle fog or distance-based opacity sells the 3D depth).

## Postprocessing

- `EffectComposer` with **Bloom**. Per spec C9, bloom is **subtle** (technical look, not
  the white-hot dreamy version). Starting values: intensity ~0.6 to 0.9, luminanceThreshold
  ~0.6, luminanceSmoothing ~0.4. Expose these in leva and tune live against the real palette.
- Optional very subtle vignette (darkness ~0.3) if it helps focus. Skip if it muddies.
- Keep the effect chain minimal for performance.

## Cursor interaction (HERO PHASE ONLY)

The whole orb system (core + orbiting particles, as one group) responds to the cursor in
the hero, echoing the 2D reference's "follows your every move" mechanic — but in 3D and
tasteful. Implementation:
- Read normalized mouse `(-1..1)` from the Zustand store.
- The orb group's target position lerps toward the mouse-driven offset (clamp the range so
  it drifts, e.g. up to ~±1.2 units in x, ~±0.8 in y — it should NEVER wander so far it
  sits directly behind and obscures the name; the name stays readable).
- Lerp factor ~0.05 for smooth trailing motion (the orb chases the cursor with a lag, like
  the 2D version's eased centerPoint).
- The orbiting particles follow because they orbit the moving core.
- This cursor response is **active in the hero phase only**. As the user begins scrolling
  past the hero (`heroProgress` rising), the cursor influence fades out (blend factor →0)
  so scroll choreography takes over cleanly and the two motions never fight.

## Tuning

Expose in a leva panel (DEV only): bloom (intensity/threshold/smoothing), core size +
emissive intensity + pulse, particle count + size range + orbit radius range + speed range,
hue range, number of orbital planes, cursor lerp + clamp, camera FOV + distance. Jacob will
dial the look in the browser. Once locked, bake the chosen values into `lib/constants.ts`.

## What the orb does NOT do
- It does not use the 2D `fillRect` trail hack. Trails are not part of this; bloom + motion
  carry the look.
- It is not a textured Earth or any recognizable object. It's an abstract glowing orb system.
- It does not respond to the cursor outside the hero phase.

(The orb's full scroll lifecycle — how it moves, sheds particles, and exits — is in
`docs/05-scroll-spec.md`.)