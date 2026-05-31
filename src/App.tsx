import { Scene } from './components/three/Scene'
import { GrainOverlay } from './components/shared/GrainOverlay'
import { Nav } from './components/nav/Nav'
import { Hero } from './components/hero/Hero'
import { Interlude } from './components/interlude/Interlude'
import { About } from './components/about/About'
import { Projects } from './components/projects/Projects'
import { Contact } from './components/contact/Contact'

function App() {
  return (
    <>
      {/* The persistent 3D <Canvas> lives here, fixed at z-0 behind all content. */}
      <Scene />
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
    </>
  )
}

export default App
