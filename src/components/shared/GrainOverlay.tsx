/*
  Subtle film-grain overlay (docs/01 - Texture). Fixed, full-viewport, non-interactive.
  Sits above the 3D canvas (z-0) but below content (z-20) so the dark background reads
  filmic rather than flat. Static SVG turbulence, so there is no per-frame cost. Keep the
  opacity very low; if it ever fights the orb glow, reduce the opacity rather than removing
  it.
*/
const grainTexture = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#grain)" />
  </svg>`,
)

export function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-10 opacity-[0.04]"
      style={{
        backgroundImage: `url("data:image/svg+xml,${grainTexture}")`,
        backgroundSize: '160px 160px',
      }}
    />
  )
}
