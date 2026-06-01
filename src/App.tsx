import { Scene } from './components/three/Scene'
import { useSmoothScroll } from './lib/lenis'
import { useHeroPointer } from './lib/useHeroPointer'
import { LoadingScreen } from './components/loading/LoadingScreen'
import { Starfield } from './components/shared/Starfield'
import { GrainOverlay } from './components/shared/GrainOverlay'
import { Nav } from './components/nav/Nav'
import { Hero } from './components/hero/Hero'
import { Interlude } from './components/interlude/Interlude'
import { About } from './components/about/About'
import { Projects } from './components/projects/Projects'
import { Contact } from './components/contact/Contact'

function App() {
  // Lenis smooth scroll + GSAP ScrollTrigger; populates scrollProgress / heroProgress / phase.
  useSmoothScroll()
  // Feeds the normalized hero pointer into the store (hero phase only); the orb reads it.
  useHeroPointer()

  return (
    <>
      {/* The persistent 3D <Canvas> lives here, fixed at z-0 behind all content. */}
      <Scene />
      {/* Faint ambient stars behind everything (z-[5]: above the canvas, below grain + content). */}
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
