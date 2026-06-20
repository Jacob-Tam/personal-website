import { useScrollStore } from '../../store/useScrollStore'

// Outward directions (px) + stagger delays for the mini orbs that spit out of the start circle on hover.
// Scaled to the larger (orb-sized) circle so they fly clear of its edge.
const SPARKS = [
  { x: '-58px', y: '-30px', d: '0s' },
  { x: '52px', y: '-42px', d: '0.14s' },
  { x: '66px', y: '18px', d: '0.28s' },
  { x: '20px', y: '58px', d: '0.42s' },
  { x: '-44px', y: '52px', d: '0.56s' },
  { x: '-66px', y: '10px', d: '0.7s' },
]

// Hero: the one-line name sits over the orb, which is HIDDEN until the visitor clicks the start circle
// below it (store.startOrb) - then the core grows in and the particles cascade on one by one. The name +
// circle fade in once the loading screen completes (store.isLoaded). On low-power/mobile there's no 3D
// canvas, so a static glowing-orb stands in (revealed on the same click).
export function Hero() {
  const isLoaded = useScrollStore((state) => state.isLoaded)
  const lowPower = useScrollStore((state) => state.lowPower)
  const orbStarted = useScrollStore((state) => state.orbStarted)
  const startOrb = useScrollStore((state) => state.startOrb)

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
            orbStarted ? 'opacity-100' : 'opacity-0'
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

      <div className="relative flex w-full translate-y-[3vh] flex-col items-center">
        {/* Name in the same face as the giant section background words (BackgroundWord: semibold,
            tracking-tighter), faint over the orb. Fades in LEFT-TO-RIGHT via the .hero-name mask wipe. */}
        <h1
          className={`hero-name text-[13vw] font-semibold leading-[0.82] tracking-tighter text-text/40 ${
            isLoaded ? 'is-in' : ''
          }`}
        >
          Jacob Tam
        </h1>
        {/* Tagline sits directly below the name (so it reads high, near "Jacob Tam"). Fades in only
            AFTER the orb is started (the click), not on load, with a short delay so it lands as the orb
            is forming. Kept in the flow (reserved space) so nothing shifts on the click. */}
        <p
          className={`mt-[3vh] max-w-xl text-body-lg text-text-mute transition-all delay-500 duration-1000 ease-out ${
            orbStarted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
        >
          Electrical engineering and varsity tennis at Queen's. I build things that mix hardware,
          code, and the occasional bad idea.
        </p>
        {/* The click target (sized to the orb), with the "click here" cue on the SAME line to its right.
            Hidden once started (it hands off to the orb fading in); grey ring by default that lights to
            accent + spits mini orbs on hover. The orb reveals here. */}
        <div className="relative mt-[2vh]">
          <button
            type="button"
            onClick={startOrb}
            aria-label="Reveal the orb"
            className={`orb-start ${
              orbStarted ? 'pointer-events-none opacity-0' : isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {SPARKS.map((spark, index) => (
              <span
                key={index}
                className="orb-spark"
                style={{ '--x': spark.x, '--y': spark.y, '--d': spark.d } as React.CSSProperties}
              />
            ))}
            <span className="orb-start-core" />
          </button>
          <span
            aria-hidden
            className={`orb-hint absolute left-full top-1/2 ml-5 -translate-y-1/2 whitespace-nowrap ${
              orbStarted ? 'opacity-0' : isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.5 3.5l11.5 6.2-4.8 1.2-2.1 4.6z" />
            </svg>
            click here
          </span>
        </div>
      </div>

      <div
        className={`absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 transition-opacity duration-700 ease-out ${
          orbStarted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="font-mono text-label uppercase text-text-mute">scroll</span>
        <span className="h-10 w-px bg-gradient-to-b from-text-mute/60 to-transparent" />
      </div>
    </section>
  )
}
