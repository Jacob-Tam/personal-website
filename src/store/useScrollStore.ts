import { create } from 'zustand'

export type OrbPhase = 'hero' | 'interlude' | 'about' | 'past'

/*
  The small set of cross-component state the 3D scene, parallax, and scroll indicator read.
  High-frequency values (scrollProgress, heroProgress, mouse) are updated once per frame from
  the Lenis RAF loop and the hero mousemove listener. Read those with
  useScrollStore.getState() inside useFrame; do NOT subscribe to them reactively inside the
  canvas, or every frame triggers a React re-render. Low-frequency values (phase, isLoaded,
  reducedMotion, lowPower) are safe to subscribe to. Setters are stubs here and get wired up
  in later steps (scroll in Step 7/8, mouse in Step 5, loaded in Step 11, the rest in 12/13).
*/
interface ScrollState {
  scrollProgress: number // 0..1 across the whole page
  heroProgress: number // 0..1 within the hero (drives cursor-follow fade-out)
  mouse: { x: number; y: number } // normalized -1..1, hero cursor follow

  phase: OrbPhase // orb lifecycle phase
  isLoaded: boolean // loading screen finished
  reducedMotion: boolean // prefers-reduced-motion
  lowPower: boolean // mobile / weak GPU -> 3D fallback

  setScrollProgress: (value: number) => void
  setHeroProgress: (value: number) => void
  setMouse: (x: number, y: number) => void
  setPhase: (phase: OrbPhase) => void
  setLoaded: (value: boolean) => void
  setReducedMotion: (value: boolean) => void
  setLowPower: (value: boolean) => void
}

export const useScrollStore = create<ScrollState>((set) => ({
  scrollProgress: 0,
  heroProgress: 0,
  mouse: { x: 0, y: 0 },

  phase: 'hero',
  isLoaded: false,
  reducedMotion: false,
  lowPower: false,

  setScrollProgress: (value) => set({ scrollProgress: value }),
  setHeroProgress: (value) => set({ heroProgress: value }),
  setMouse: (x, y) => set({ mouse: { x, y } }),
  setPhase: (phase) => set({ phase }),
  setLoaded: (value) => set({ isLoaded: value }),
  setReducedMotion: (value) => set({ reducedMotion: value }),
  setLowPower: (value) => set({ lowPower: value }),
}))
