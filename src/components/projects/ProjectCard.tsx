import { useRef } from 'react'
import { Parallax } from '../shared/Parallax'
import { MEDIA_READY } from '../../lib/assets'
import type { Project, ProjectMediaKind } from './projectsData'

/*
  Project card: media + title + tagline (tags live in the expanded view, docs/06). Hover lifts
  and scales the card, hints the border toward blue, and starts the video (muted/loop). Videos
  use preload="none" and only play on hover, so the four never autoplay at once (docs/03). Until
  MEDIA_READY the media is a placeholder poster with a play affordance.
*/
export function ProjectCard({ project, onOpen }: { project: Project; onOpen: (project: Project) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  function handleEnter() {
    videoRef.current?.play().catch(() => {})
  }
  function handleLeave() {
    videoRef.current?.pause()
  }

  return (
    <button
      type="button"
      data-project-card
      onClick={() => onOpen(project)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="group block w-full text-left transition-transform duration-300 ease-out hover:-translate-y-1"
    >
      {/* Media drifts a touch slower than the caption below it (docs/05 parallax). */}
      <Parallax speed={0.08}>
        <div className="project-card-media relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-surface-2 transition-[transform,border-color,box-shadow] duration-300 ease-out group-hover:scale-[1.02] group-hover:border-accent/40">
          {MEDIA_READY ? (
            project.media.kind === 'video' ? (
              <video
                ref={videoRef}
                src={project.media.src}
                muted
                loop
                playsInline
                preload="none"
                className="h-full w-full object-cover"
              />
            ) : (
              <img src={project.media.src} alt={project.media.alt} className="h-full w-full object-cover" />
            )
          ) : (
            <PlaceholderVisual kind={project.media.kind} />
          )}
        </div>
      </Parallax>
      <h3 className="mt-5 text-h3 text-text">{project.title}</h3>
      <p className="mt-2 text-body text-text-mute">{project.tagline}</p>
    </button>
  )
}

function PlaceholderVisual({ kind }: { kind: ProjectMediaKind }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      {kind === 'video' ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-text-mute transition-colors duration-300 group-hover:border-accent/50 group-hover:text-accent-hi">
          <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      ) : (
        <span className="font-mono text-label uppercase text-text-mute">CAD render</span>
      )}
    </div>
  )
}
