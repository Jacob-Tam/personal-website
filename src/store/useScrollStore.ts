import { create } from 'zustand'
import { detectLowPower, detectReducedMotion } from '../lib/gpuTier'

export type OrbPhase = 'hero' | 'interlude' | 'about' | 'past'

/*
  The small set of cross-component state the 3D scene, parallax, and scroll indicator read.
  High-frequency values (scrollProgress, heroProgress, interludeProgress, driftProgress, mouse)
  are updated from the Lenis RAF / ScrollTrigger scrubs and the hero mousemove listener. Read
  those with useScrollStore.getState() inside useFrame; do NOT subscribe to them reactively
  inside the canvas. Low-frequency values (phase, isLoaded, canvasReady, reducedMotion, lowPower)
  are safe to subscribe to (e.g. phase drives the canvas frameloop; isLoaded drives the hero reveal).
*/
interface ScrollState {
  scrollProgress: number // 0..1 across the whole page
  heroProgress: number // 0..1 within the hero (drives cursor-follow fade-out)
  interludeProgress: number // 0..1 across the pinned interlude (drives the orb's slow + pulse)
  driftProgress: number // 0..1 from interlude end through end of About (orb drifts up + sheds)
  mouse: { x: number; y: number } // normalized -1..1, hero cursor follow

  phase: OrbPhase // orb lifecycle phase
  isLoaded: boolean // loading screen finished -> hero revealed
  canvasReady: boolean // the 3D canvas has rendered its first frame (loading-readiness signal)
  reducedMotion: boolean // prefers-reduced-motion
  lowPower: boolean // mobile / weak GPU -> 3D fallback (no canvas, no choreography/parallax)

  setScrollProgress: (value: number) => void
  setHeroProgress: (value: number) => void
  setInterludeProgress: (value: number) => void
  setDriftProgress: (value: number) => void
  setMouse: (x: number, y: number) => void
  setPhase: (phase: OrbPhase) => void
  setLoaded: (value: boolean) => void
  setCanvasReady: (value: boolean) => void
  setReducedMotion: (value: boolean) => void
  setLowPower: (value: boolean) => void
}

export const useScrollStore = create<ScrollState>((set) => ({
  scrollProgress: 0,
  heroProgress: 0,
  interludeProgress: 0,
  driftProgress: 0,
  mouse: { x: 0, y: 0 },

  phase: 'hero',
  isLoaded: false,
  canvasReady: false,
  reducedMotion: detectReducedMotion(), // seeded at load; useReducedMotion keeps it live
  lowPower: detectLowPower(), // resolved once at load; gates the canvas, choreography, and parallax

  setScrollProgress: (value) => set({ scrollProgress: value }),
  setHeroProgress: (value) => set({ heroProgress: value }),
  setInterludeProgress: (value) => set({ interludeProgress: value }),
  setDriftProgress: (value) => set({ driftProgress: value }),
  setMouse: (x, y) => set({ mouse: { x, y } }),
  setPhase: (phase) => set({ phase }),
  setLoaded: (value) => set({ isLoaded: value }),
  setCanvasReady: (value) => set({ canvasReady: value }),
  setReducedMotion: (value) => set({ reducedMotion: value }),
  setLowPower: (value) => set({ lowPower: value }),
}))
