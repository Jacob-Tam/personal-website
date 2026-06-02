/*
  A subtle grey planet whose limb rises at the bottom of the Contact section - a big sphere mostly
  below the fold, only its curved top (a dome) showing. The surface (a faint albedo texture) rotates
  slowly inside a fixed circular clip, while a static gradient gives it sphere form and melts the
  limb into the near-black page so the stars + planets read as the sky above it. Decorative; the
  rotation is disabled under reduced motion (see index.css). Sized so the dome shows at any width.
*/
export function MoonSurface() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 overflow-hidden rounded-full"
      style={{
        width: 'max(900px, 78vw)',
        height: 'max(900px, 78vw)',
        bottom: 'calc(clamp(160px, 24vw, 320px) - max(900px, 78vw))',
      }}
    >
      {/* slowly rotating surface (subtle albedo; slightly oversized so the clip never gaps) */}
      <div
        className="moon-rotate absolute inset-[-6%] bg-cover bg-center opacity-90"
        style={{ backgroundImage: 'url(/moon-surface.webp)' }}
      />
      {/* fixed: a faint highlight on the dome + a soft limb that melts into the page */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 15%, rgba(178,195,222,0.10), transparent 46%), radial-gradient(circle at 50% 50%, transparent 78%, rgba(0,1,2,0.55) 92%, #000102 100%)',
        }}
      />
    </div>
  )
}
