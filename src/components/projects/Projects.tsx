import { useState } from 'react'
import { Reveal } from '../shared/Reveal'
import { PROJECTS, type Project } from './projectsData'
import { ProjectCard } from './ProjectCard'
import { ProjectExpanded } from './ProjectExpanded'

/*
  Projects: section title + a deep, very faint "PROJECTS" background word + a 2-column staggered
  layout of the four cards (docs/06 order). The right column is offset down for the masonry-ish
  stagger. Clicking a card opens the overlay-style expanded view. The faint word's parallax
  (Step 9), the scroll indicator and clip-path opener (Step 10) come later. Which card is open is
  local state, not the global store (docs/03).
*/
export function Projects() {
  const [openProject, setOpenProject] = useState<Project | null>(null)

  return (
    <section id="projects" className="relative overflow-hidden px-6 py-32 md:px-12">
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 select-none text-[22vw] font-semibold leading-none tracking-tighter text-text/5"
      >
        PROJECTS
      </span>

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
