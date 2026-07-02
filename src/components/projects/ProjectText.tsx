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
      <p className="mt-3 text-body text-text-mute md:text-body-lg">{project.tagline}</p>
      <p className="mt-4 max-w-prose text-body text-text md:mt-5">{project.description}</p>
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
      {project.repo && (
        <a
          href={project.repo}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 font-mono text-label uppercase text-text-mute transition-colors duration-300 hover:border-accent/50 hover:text-accent-hi"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          View code
        </a>
      )}
    </div>
  )
}
