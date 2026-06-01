// Mobile / low-power detection for the 3D fallback (docs/03). When this is true we skip the WebGL
// canvas entirely (a static hero stands in) and disable scroll choreography + parallax. Evaluated
// once at load: a phone won't cross the breakpoint mid-session, and hot-swapping the whole 3D scene
// when a desktop window is dragged very narrow isn't worth the complexity.
//
// (A finer GPU-tier check via detect-gpu, per docs/03, could be layered on later for weak GPUs on
// larger screens; viewport width + WebGL availability covers the phone case this step targets.)
export function detectLowPower(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  // Primary signal: a phone-ish viewport (docs/03 uses max-width: 768px).
  const smallScreen = window.matchMedia('(max-width: 768px)').matches
  // Hard requirement: without WebGL the orb can't render at all, so fall back regardless of size.
  return smallScreen || !supportsWebGL()
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
