import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useScrollStore } from '../store/useScrollStore'
import { CHOREOGRAPHY, PROJECTS_JOURNEY } from './constants'

gsap.registerPlugin(ScrollTrigger)

// Module handle so the nav (smooth scrollTo) and the project overlay (stop/start) can reach the
// live Lenis instance without prop-drilling.
export let lenis: Lenis | null = null

// Interlude pin length (fraction of viewport height). Held here so the dev leva 'choreography'
// folder can live-tune it: setting it re-refreshes ScrollTrigger so the pinned region resizes.
export let interludePinVh = CHOREOGRAPHY.interludePinVh
export function setInterludePin(value: number) {
  interludePinVh = value
  ScrollTrigger.refresh()
}

// Projects journey pin length (fraction of viewport height); the dev leva 'projects' folder
// live-tunes it (re-refreshes ScrollTrigger so the pinned region resizes).
export let projectsPinVh = PROJECTS_JOURNEY.pinVh
export function setProjectsPin(value: number) {
  projectsPinVh = value
  ScrollTrigger.refresh()
}

/*
  Single source of truth for scroll (docs/03, docs/09): Lenis drives GSAP's ticker and
  ScrollTrigger updates off Lenis, so smoothing and triggers never desync. One place writes the
  store's scroll values. phase + heroProgress are derived from section DOM positions via
  ScrollTrigger (NOT fixed scroll percentages), so they survive content/height changes. The exact
  boundaries get tuned when the orb choreography lands in Step 8.
*/
export function useSmoothScroll() {
  useEffect(() => {
    const instance = new Lenis({ duration: 1.1, smoothWheel: true, autoRaf: false })
    lenis = instance

    const raf = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    const {
      setScrollProgress,
      setHeroProgress,
      setInterludeProgress,
      setDriftProgress,
      setPhase,
      setProjectsActive,
      setProjectsProgress,
    } = useScrollStore.getState()
    instance.on('scroll', () => {
      ScrollTrigger.update()
      setScrollProgress(instance.progress || 0)
    })

    // On mobile / weak-GPU there's no orb to drive, so skip the choreography AND the interlude pin
    // (docs/03: disable scroll choreography, keep native-ish scroll). Lenis + ScrollTrigger.update
    // stay wired above, so scrollProgress and the <Reveal> entrances still work.
    const { lowPower, reducedMotion } = useScrollStore.getState()
    const triggers: ScrollTrigger[] = []
    if (lowPower) {
      // No 3D canvas on mobile/low-power, so there are no orb triggers at all.
    } else if (reducedMotion) {
      // Orb stays STATIC (no choreography). Just fade the whole canvas out as the user leaves the
      // hero so the static orb doesn't sit behind the lower sections - opacity only (docs/01).
      const orbLayer = () => document.getElementById('orb-canvas-layer')
      triggers.push(
        ScrollTrigger.create({
          trigger: '#interlude',
          start: 'top 85%',
          onEnter: () => orbLayer()?.classList.add('opacity-0'),
          onLeaveBack: () => orbLayer()?.classList.remove('opacity-0'),
        }),
      )
    } else {
      triggers.push(
        // heroProgress 0..1 as the hero scrolls out; drives the cursor-follow fade.
        ScrollTrigger.create({
          trigger: '#hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
          onUpdate: (self) => setHeroProgress(self.progress),
        }),
        // Interlude: PINNED so the user must scroll extra to pass it ("harder to scroll", per
        // Jacob's request) - the dwell where the orb slows almost to a stop and pulses once.
        // interludeProgress scrubs 0..1 across the pin and drives that beat.
        ScrollTrigger.create({
          trigger: '#interlude',
          start: 'top top',
          end: () => '+=' + window.innerHeight * interludePinVh,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => setInterludeProgress(self.progress),
          onEnter: () => setPhase('interlude'),
          onLeaveBack: () => setPhase('hero'),
        }),
        // About: drift the orb upward (scrub) and own the about <-> past transitions. driftProgress
        // hits 1 as About's bottom reaches the top of the screen -> orb fully gone -> phase 'past'.
        ScrollTrigger.create({
          trigger: '#about',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
          onUpdate: (self) => setDriftProgress(self.progress),
          onEnter: () => setPhase('about'),
          onEnterBack: () => setPhase('about'),
          onLeave: () => setPhase('past'),
          onLeaveBack: () => setPhase('interlude'),
        }),
        // Projects: PINNED solar-system journey. The scroll across the pin scrubs projectsProgress
        // 0..1 (camera-through-space past the 4 planets); onToggle flags projectsActive so the
        // canvas re-enables for it. Releases into Contact. Mirrors the interlude pin; trigger order
        // stays top-to-bottom (hero, interlude, about, projects).
        ScrollTrigger.create({
          trigger: '#projects',
          start: 'top top',
          end: () => '+=' + window.innerHeight * projectsPinVh,
          pin: true,
          scrub: true,
          // No anticipatePin here: Lenis already smooths the wheel input, so ScrollTrigger's
          // velocity-based pre-pin lookahead just overshoots and lurches the scroll at the
          // About->Projects seam. Without it the pin engages exactly at top/top, smoothly.
          invalidateOnRefresh: true,
          onUpdate: (self) => setProjectsProgress(self.progress),
          onToggle: (self) => setProjectsActive(self.isActive),
        }),
      )
    }

    ScrollTrigger.refresh()
    // Fonts can shift layout after that first refresh; re-measure once they are ready so the pin
    // positions (and other triggers) are correct on load.
    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    // DEV-only: expose the store + log phase changes so the values are easy to verify.
    let unsubscribe: (() => void) | undefined
    if (import.meta.env.DEV) {
      ;(window as unknown as { scrollStore?: typeof useScrollStore }).scrollStore = useScrollStore
      ;(window as unknown as { lenis?: Lenis }).lenis = instance
      unsubscribe = useScrollStore.subscribe((state, previous) => {
        if (state.phase !== previous.phase) console.log('[orb phase]', state.phase)
      })
    }

    return () => {
      unsubscribe?.()
      triggers.forEach((trigger) => trigger.kill())
      gsap.ticker.remove(raf)
      instance.destroy()
      if (lenis === instance) lenis = null
    }
  }, [])
}
