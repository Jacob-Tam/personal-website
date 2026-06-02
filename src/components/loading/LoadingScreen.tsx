import { useEffect, useState } from 'react'
import { useScrollStore } from '../../store/useScrollStore'
import { lenis } from '../../lib/lenis'
import { ASSETS } from '../../lib/assets'
import { Starfield } from '../shared/Starfield'

// Minimum time on screen so it doesn't flash + the logo/stars get a beat (docs/06).
const MIN_DURATION = 1800
// Fade-out duration; the site is revealed (hero name fades in) only after this completes.
const FADE_MS = 1200

// Hand-tuned so a few stars streak across during the load; positions spread, staggered delays.
const SHOOTING_STARS = [
  { top: 8, left: 10, delay: 0.2, duration: 2.2 },
  { top: 24, left: 42, delay: 1.1, duration: 1.8 },
  { top: 38, left: 4, delay: 0.6, duration: 2.6 },
  { top: 52, left: 30, delay: 1.7, duration: 2.0 },
  { top: 6, left: 56, delay: 2.2, duration: 2.4 },
  { top: 64, left: 18, delay: 0.9, duration: 2.1 },
  { top: 16, left: 72, delay: 1.4, duration: 1.7 },
]

/*
  Full-viewport loading screen (docs/06): the JT logo on black over the SAME ambient starfield as
  the page (seeded -> identical star positions, so the field persists as the loader fades), with
  white shooting-star trails and a thin white progress line. It completes on REAL readiness -
  webfonts + the 3D canvas's first frame (store.canvasReady) + a minimum. Then it fades out; only
  ONCE IT'S GONE is the hero revealed (store.isLoaded) so the name fades in on the revealed page
  rather than showing through the fade. Scroll is locked until then.
*/
export function LoadingScreen() {
  const setLoaded = useScrollStore((state) => state.setLoaded)
  const reducedMotion = useScrollStore((state) => state.reducedMotion)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden' // lock scroll during load

    const start = performance.now()
    let fontsReady = false
    document.fonts?.ready.then(() => (fontsReady = true)).catch(() => (fontsReady = true))

    let value = 0
    let revealTimer: number | undefined
    let raf = requestAnimationFrame(function tick(now) {
      const elapsed = now - start
      // On low-power there's no canvas, so don't wait on canvasReady (it would never fire and the
      // loader would hang forever); fonts + the minimum duration are enough.
      const state = useScrollStore.getState()
      const ready = fontsReady && (state.lowPower || state.canvasReady) && elapsed >= MIN_DURATION
      // Crawl honestly toward 92% until everything's actually ready, then complete to 100%.
      const target = ready ? 100 : Math.min(92, (elapsed / MIN_DURATION) * 92)
      value += (target - value) * 0.12
      setProgress(value)

      if (ready && value > 99.3) {
        setProgress(100)
        setDone(true) // begin the fade-out
        // Reveal the site only AFTER the loader has finished fading, so the hero name doesn't show
        // through the fade - it fades in cleanly on the already-revealed page. Scroll stays locked
        // until then.
        revealTimer = window.setTimeout(() => {
          document.documentElement.style.overflow = previousOverflow
          lenis?.scrollTo(0, { immediate: true })
          lenis?.start()
          setLoaded(true) // hero name/tagline fade in now, on the revealed page
          setGone(true) // unmount the (now-invisible) loader
        }, FADE_MS)
        return
      }
      raf = requestAnimationFrame(tick)
    })

    return () => {
      cancelAnimationFrame(raf)
      if (revealTimer) window.clearTimeout(revealTimer)
      document.documentElement.style.overflow = previousOverflow
    }
  }, [setLoaded])

  if (gone) return null

  return (
    <div
      style={{ transitionDuration: `${FADE_MS}ms` }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg transition-opacity ease-out ${
        done ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Same ambient starfield as the page (seeded -> identical positions), so the stars stay put
          as the loader fades into the site. Sits behind the logo (which is z-10). */}
      <Starfield />

      {!reducedMotion && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {SHOOTING_STARS.map((star, i) => (
            <span
              key={i}
              className="shooting-star"
              style={{
                top: `${star.top}%`,
                left: `${star.left}%`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center">
        <img src={ASSETS.jtLogo} alt="Jacob Tam" className="w-44" />
        <div className="mt-10 h-px w-44 overflow-hidden bg-text-mute/25">
          <div
            className="h-full bg-white transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
