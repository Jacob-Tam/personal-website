import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useScrollStore } from '../store/useScrollStore'
import { CHOREOGRAPHY } from './constants'

gsap.registerPlugin(ScrollTrigger)

// Module handle so the nav (smooth scrollTo) and the project overlay (stop/start) can reach the
// live Lenis instance without prop-drilling.
export let lenis: Lenis | null = null

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
    const { setScrollProgress, setHeroProgress, setInterludeProgress, setDriftProgress, setPhase } =
      useScrollStore.getState()
    instance.on('scroll', () => {
      ScrollTrigger.update()
      setScrollProgress(instance.progress || 0)
    })

    const triggers = [
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
        end: () => '+=' + window.innerHeight * CHOREOGRAPHY.interludePinVh,
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
    ]

    ScrollTrigger.refresh()

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
