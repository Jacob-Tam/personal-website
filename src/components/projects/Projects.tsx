import { useEffect, useState } from 'react'
import { Reveal } from '../shared/Reveal'
import { BackgroundWord } from '../shared/BackgroundWord'
import { ScrollIndicator } from './ScrollIndicator'
import { PROJECTS, type Project } from './projectsData'
import { ProjectCard } from './ProjectCard'
import { ProjectExpanded } from './ProjectExpanded'

/*
  Projects: section title + a deep faint "PROJECTS" word + a 2-column staggered layout of the four
  cards (docs/06 order). Clicking a card opens the overlay-style expanded view (open state is local,
  docs/03). A right-edge scroll indicator tracks progress through the section - only on wider screens
  with motion allowed.
*/
export function Projects() {
  const [openProject, setOpenProject] = useState<Project | null>(null)
  const [indicatorEnabled, setIndicatorEnabled] = useState(false)

  // The scroll indicator runs only on wider screens with motion allowed (mobile/low-power is
  // formalized in Step 12, reduced motion in Step 13).
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 768px)')
    const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)')
    const update = () => setIndicatorEnabled(wide.matches && motionOk.matches)
    update()
    wide.addEventListener('change', update)
    motionOk.addEventListener('change', update)
    return () => {
      wide.removeEventListener('change', update)
      motionOk.removeEventListener('change', update)
    }
  }, [])

  return (
    <section id="projects" className="relative overflow-hidden px-6 py-32 md:px-12">
      <BackgroundWord className="left-1/2 top-20 -translate-x-1/2" parallax={0.5}>PROJECTS</BackgroundWord>
      {indicatorEnabled && <ScrollIndicator />}

      <div className="relative mx-auto max-w-5xl">
        <Reveal>
          <h2 className="text-h2 text-text">Projects</h2>
        </Reveal>

        <div className="mt-16 grid gap-12 md:grid-cols-2">
          <div className="flex flex-col gap-16">
            <Reveal>
              <ProjectCard project={PROJECTS[0]} onOpen={(project) => setOpenProject(project)} />
            </Reveal>
            <Reveal>
              <ProjectCard project={PROJECTS[2]} onOpen={(project) => setOpenProject(project)} />
            </Reveal>
          </div>
          <div className="flex flex-col gap-16 md:mt-28">
            <Reveal>
              <ProjectCard project={PROJECTS[1]} onOpen={(project) => setOpenProject(project)} />
            </Reveal>
            <Reveal>
              <ProjectCard project={PROJECTS[3]} onOpen={(project) => setOpenProject(project)} />
            </Reveal>
          </div>
        </div>
      </div>

      {openProject && <ProjectExpanded project={openProject} onClose={() => setOpenProject(null)} />}
    </section>
  )
}
