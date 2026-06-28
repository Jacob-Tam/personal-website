// True ONLY when WebGL is unavailable - then the 3D scene can't render at all, so we fall back to the
// static hero + flat sections. Phones now KEEP the full 3D scene (orb + projects journey); per Jacob the
// mobile experience should match desktop. Quality is scaled down for phones instead (see detectMobile +
// the mobile tuning in Scene), rather than dropping the scene. Evaluated once at load.
export function detectLowPower(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  return !supportsWebGL()
}

// Phone-ish viewport (docs/03 uses max-width: 768px). The 3D scene still runs, but Scene scales quality
// down on mobile (lower DPR, fewer orb particles / journey stars / belt rocks, simpler planets) so it
// stays smooth on mobile GPUs. Evaluated once at load - a phone won't cross the breakpoint mid-session.
export function detectMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 768px)').matches
}

// Touch-primary device (phone OR tablet): a coarse pointer. Drives the touch-only UI (tap the orb to
// recolour it, "tap here" cue) and, with detectMobile, the 3D quality scaling - so tablets get both.
export function detectTouch(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches
}

// Whether the user asked the OS to minimize motion (docs/01). Drives the static-orb + no-choreography
// + no-parallax path. Seeded into the store once at load; useReducedMotion keeps it live after.
export function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    )
  } catch {
    return false
  }
}
