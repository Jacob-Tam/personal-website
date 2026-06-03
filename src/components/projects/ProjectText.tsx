import type { Project } from './projectsData'

/*
  The RIGHT-side text column for a project (journey + flat fallback): title, tagline, full
  description, and Geist Mono tech tags - all shown INLINE (no click-to-expand; one project on
  screen at a time leaves room). Copy is verbatim from projectsData/docs/02.
*/
export function ProjectText({ project, className }: { project: Project; className?: string }) {
  return (
    <div className={className}>
      <h3 className="text-h3 text-text">{project.title}</h3>
      <p className="mt-3 text-body-lg text-text-mute">{project.tagline}</p>
      <p className="mt-5 max-w-prose text-body text-text">{project.description}</p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {project.tech.map((tag) => (
          <li
            key={tag}
            className="rounded-md border border-border px-3 py-1 font-mono text-label uppercase text-text-mute"
          >
            {tag}
          </li>
        ))}
      </ul>
    </div>
  )
}
