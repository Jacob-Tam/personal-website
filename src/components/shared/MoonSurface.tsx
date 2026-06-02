/*
  A procedurally-generated grey lunar surface that closes the page below Contact - the ground the
  whole space scene (orb, stars, planets) sits above. The image's top is transparent and its horizon
  melts into the near-black page, so the stars + planets read as the sky above it. Cover + top
  anchoring keeps the horizon visible at every width; decorative + non-interactive.
*/
export function MoonSurface() {
  return (
    <div
      aria-hidden
      className="w-full"
      style={{
        height: 'clamp(220px, 30vw, 440px)',
        backgroundImage: 'url(/moon-surface.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
