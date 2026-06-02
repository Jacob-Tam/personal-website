import { lazy, Suspense } from 'react'
import { useSmoothScroll } from './lib/lenis'
import { useHeroPointer } from './lib/useHeroPointer'
import { useReducedMotion } from './lib/useReducedMotion'
import { useScrollStore } from './store/useScrollStore'
import { LoadingScreen } from './components/loading/LoadingScreen'
import { Planets } from './components/shared/Planets'
import { Starfield } from './components/shared/Starfield'
import { GrainOverlay } from './components/shared/GrainOverlay'
import { Nav } from './components/nav/Nav'
import { Hero } from './components/hero/Hero'
import { Interlude } from './components/interlude/Interlude'
import { About } from './components/about/About'
import { Projects } from './components/projects/Projects'
import { Contact } from './components/contact/Contact'

// three.js (+ drei + postprocessing) is heavy; lazy-load the 3D scene as its own chunk so the
// initial bundle and the loading screen paint fast. The loader stays up until the orb's first
// frame (store.canvasReady), so there's no flash of a missing orb.
const Scene = lazy(() => import('./components/three/Scene').then((m) => ({ default: m.Scene })))

function App() {
  // Lenis smooth scroll + GSAP ScrollTrigger; populates scrollProgress / heroProgress / phase.
  useSmoothScroll()
  // Feeds the normalized hero pointer into the store (hero phase only); the orb reads it.
  useHeroPointer()
  // Keeps store.reducedMotion live with the OS setting (static orb + no choreography/parallax).
  useReducedMotion()
  // Mobile / weak-GPU: skip the 3D canvas entirely (Hero shows a static orb instead, docs/03).
  const lowPower = useScrollStore((state) => state.lowPower)

  return (
    <>
      {/* The persistent 3D <Canvas>, fixed at z-0 behind all content. Lazy + omitted on low-power. */}
      {!lowPower && (
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      )}
      {/* Faint ambient backdrop behind everything (above the canvas, below grain + content):
          slow-drifting planets (z-[4]) with the starfield in front of them (z-[5]). */}
      <Planets />
      <Starfield />
      <GrainOverlay />
      <Nav />
      <main className="relative z-20">
        <Hero />
        <Interlude />
        <About />
        <Projects />
        <Contact />
      </main>
      {/* Analytics drop-in (docs/03): add <Analytics /> here later, no refactor needed. */}
      {/* Loading screen sits on top (z-100) and unmounts itself once everything is ready. */}
      <LoadingScreen />
    </>
  )
}

export default App
