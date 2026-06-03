import { useEffect, useRef, useState, type RefObject } from 'react'
import { useScrollStore } from '../../store/useScrollStore'
import { panelOpacity, journeyActiveIndex } from '../../lib/projectsJourney'
import { PROJECTS_JOURNEY } from '../../lib/constants'
import { Reveal } from '../shared/Reveal'
import { BackgroundWord } from '../shared/BackgroundWord'
import { ProjectMedia } from './ProjectMedia'
import { ProjectText } from './ProjectText'
import { PROJECTS } from './projectsData'

/*
  Projects - the pinned "solar system journey" (feat/projects-planets). On desktop / full power the
  section pins (GSAP ScrollTrigger in lib/lenis), the canvas re-enables (store.projectsActive), and
  scroll (projectsProgress) drives a camera trip past 4 planets in shared 3D space - one per project.
  Per project the planet travels in from the right-background, arrives + recedes/dims, and its MEDIA
  fades in on the LEFT + TEXT on the RIGHT (in front of the dimmed planet), then it exits left as the
  next fades in. The faint giant "PROJECTS" word sits fixed in the deep background the whole way.

  The 3D planets live in the canvas (three/ProjectsScene); the 2D panels here are driven by the SAME
  projectsProgress via lib/projectsJourney, so the two layers stay locked together.

  Mobile / low-power / reduced-motion: NO pin, NO 3D. The four projects render as plain stacked
  vertical sections - same content, normal scroll. The pin + canvas are already gated off for those
  in lib/lenis + App, so here we only swap the layout.
*/
export function Projects() {
  const lowPower = useScrollStore((state) => state.lowPower)
  const reducedMotion = useScrollStore((state) => state.reducedMotion)

  if (lowPower || reducedMotion) return <ProjectsFlat />
  return <ProjectsJourney />
}

// Drives the four DOM panels each frame from projectsProgress: opacity (peaks while a project's planet
// is arrived) + a subtle upward rise. Writes straight to refs (no per-frame React re-render, docs/09);
// only activeIndex (which video should play) flips to React state, and that changes a handful of times.
function useJourneyPanels(refs: RefObject<(HTMLDivElement | null)[]>) {
  const projectsActive = useScrollStore((state) => state.projectsActive)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    if (!projectsActive) {
      refs.current.forEach((element) => element && (element.style.opacity = '0'))
      setActiveIndex(-1)
      return
    }
    let raf = 0
    const tick = () => {
      const progress = useScrollStore.getState().projectsProgress
      refs.current.forEach((element, index) => {
        if (!element) return
        const opacity = panelOpacity(progress, index)
        element.style.opacity = String(opacity)
        element.style.transform = `translateY(${(1 - opacity) * PROJECTS_JOURNEY.panelRise}px)`
      })
      const active = journeyActiveIndex(progress)
      setActiveIndex((previous) => (previous === active ? previous : active))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [projectsActive, refs])

  return activeIndex
}

// Desktop / full-power: one viewport-height section the ScrollTrigger pins. The planets live in the
// canvas behind this (z-0); the four media/text panels stack here (z-20) and cross-fade as you travel.
function ProjectsJourney() {
  const panelRefs = useRef<(HTMLDivElement | null)[]>([])
  const activeIndex = useJourneyPanels(panelRefs)

  return (
    <section id="projects" className="relative h-screen overflow-hidden">
      {/* Real heading for the document outline; the giant word below is decorative (aria-hidden). */}
      <h2 className="sr-only">Projects</h2>
      <BackgroundWord className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">PROJECTS</BackgroundWord>

      {PROJECTS.map((project, index) => (
        <div
          key={project.id}
          ref={(element) => {
            panelRefs.current[index] = element
          }}
          className="absolute inset-0 flex items-center opacity-0 will-change-[opacity,transform]"
        >
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 items-center gap-12 px-12">
            <ProjectMedia project={project} isActive={activeIndex === index} />
            <ProjectText project={project} />
          </div>
        </div>
      ))}
    </section>
  )
}

// Mobile / low-power / reduced-motion: the same four projects stacked vertically, normal scroll.
// Reveal is opacity-only under reduced motion (docs/01), so this stays calm and fully readable.
function ProjectsFlat() {
  return (
    <section id="projects" className="relative overflow-hidden px-6 py-32 md:px-12">
      <BackgroundWord className="left-1/2 top-20 -translate-x-1/2">PROJECTS</BackgroundWord>

      <div className="relative mx-auto max-w-5xl">
        <Reveal>
          <h2 className="text-h2 text-text">Projects</h2>
        </Reveal>

        <div className="mt-16 flex flex-col gap-24">
          {PROJECTS.map((project) => (
            <Reveal key={project.id} className="grid items-center gap-8 md:grid-cols-2">
              <ProjectMedia project={project} />
              <ProjectText project={project} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
