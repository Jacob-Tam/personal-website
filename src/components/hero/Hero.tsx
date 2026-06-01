import { useScrollStore } from '../../store/useScrollStore'

// Hero: name + tagline (verbatim, docs/02) centered over the orb. Name, tagline, and the scroll
// affordance fade + rise in a short cascade once the loading screen completes (store.isLoaded),
// landing as the loader fades out and the orb becomes visible behind them. On low-power/mobile
// there's no 3D canvas, so a static glowing-orb still sits behind the name instead (docs/03).
export function Hero() {
  const isLoaded = useScrollStore((state) => state.isLoaded)
  const lowPower = useScrollStore((state) => state.lowPower)

  return (
    <section
      id="hero"
      className="relative flex min-h-svh flex-col items-center justify-center px-6 text-center"
    >
      {/* Static orb stand-in for the 3D scene on low-power/mobile: a soft glowing disc sitting
          just above the name, where the live orb hovers on desktop. Placeholder CSS glow until a
          real still exported from the desktop scene lands at ASSETS.orbStill. */}
      {lowPower && (
        <div
          aria-hidden
          className={`pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-1000 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            width: 'clamp(220px, 74vw, 340px)',
            height: 'clamp(220px, 74vw, 340px)',
            background:
              'radial-gradient(circle at 50% 46%, rgba(234,243,255,0.92) 0%, rgba(130,188,226,0.5) 16%, rgba(68,137,183,0.26) 34%, rgba(31,70,102,0.12) 52%, transparent 72%)',
            boxShadow: '0 0 70px 12px rgba(68,137,183,0.16)',
            filter: 'blur(1.5px)',
          }}
        />
      )}

      {/* Contrast floor: a soft radial darkening behind the text so the name stays readable over
          the bright orb wherever it drifts (docs/06). Subtle, non-interactive. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 42rem 26rem at center, color-mix(in oklab, var(--color-bg) 70%, transparent) 0%, transparent 70%)',
        }}
      />

      <div className="relative">
        <h1
          className={`text-display text-text transition-all duration-1000 ease-out ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
          }`}
        >
          Jacob Tam
        </h1>
        <p
          className={`mx-auto mt-6 max-w-xl text-body-lg text-text-mute transition-all delay-200 duration-1000 ease-out ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
          }`}
        >
          Electrical engineering and varsity tennis at Queen's. I build things that mix hardware,
          code, and the occasional bad idea.
        </p>
      </div>

      <div
        className={`absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 transition-opacity delay-500 duration-700 ease-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="font-mono text-label uppercase text-text-mute">scroll</span>
        <span className="h-10 w-px bg-gradient-to-b from-text-mute/60 to-transparent" />
      </div>
    </section>
  )
}
