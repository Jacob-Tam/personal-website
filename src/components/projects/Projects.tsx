import { useScrollStore } from '../../store/useScrollStore'
import { Reveal } from '../shared/Reveal'
import { BackgroundWord } from '../shared/BackgroundWord'
import { ProjectMedia } from './ProjectMedia'
import { ProjectText } from './ProjectText'
import { PROJECTS } from './projectsData'

/*
  Projects — the pinned "solar system journey" (feat/projects-planets). On desktop / full power the
  section pins (GSAP ScrollTrigger in lib/lenis), the canvas re-enables (store.projectsActive), and
  scroll drives a camera trip past 4 planets in shared 3D space - one per project. Per project: the
  MEDIA fades in on the LEFT and the TEXT on the RIGHT, in front of that project's (dimmed, receded)
  planet. The faint giant "PROJECTS" word sits fixed in the deep background for the whole journey.

  STEP 1 (this commit): static only - the pin engages, the canvas comes back with ONE parked
  placeholder planet, and project 1's media-left / text-right panels render. No camera travel and no
  per-project fades yet (step 2); no scroll indicator yet (step 3).

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

// Desktop / full-power: a single viewport-height section the ScrollTrigger pins. The four planets
// live in the canvas behind this (z-0); these panels are content (z-20) rendered in front.
function ProjectsJourney() {
  return (
    <section id="projects" className="relative h-screen overflow-hidden">
      {/* Real heading for the document outline; the giant word below is decorative (aria-hidden). */}
      <h2 className="sr-only">Projects</h2>
      <BackgroundWord className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">PROJECTS</BackgroundWord>

      {/* STEP 1: project 1's panels, static. Step 2 mounts all four and drives their fades + the
          camera travel from store.projectsProgress (read per-frame, no reactive subscriptions). */}
      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 items-center gap-12 px-12">
          <ProjectMedia project={PROJECTS[0]} />
          <ProjectText project={PROJECTS[0]} />
        </div>
      </div>
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
