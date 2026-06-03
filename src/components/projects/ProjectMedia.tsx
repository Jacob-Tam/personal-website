import { useEffect, useRef } from 'react'
import { MEDIA_READY } from '../../lib/assets'
import type { Project, ProjectMediaKind } from './projectsData'

/*
  The LEFT-side media panel for a project (journey + flat fallback). A 2D/DOM layer in front of the
  canvas - NOT a video texture in Three.js - so media quality stays high. Until MEDIA_READY it's a
  placeholder poster; real files drop into /public/media with no code change. Only the ACTIVE project's
  clip plays (`isActive`, set by the journey as each planet arrives); the rest stay paused at the start
  (preload none -> the four never autoplay at once, docs/03). isActive is undefined in the flat
  fallback, so nothing autoplays on mobile either.
*/
export function ProjectMedia({
  project,
  isActive,
  className,
}: {
  project: Project
  isActive?: boolean
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isActive) {
      video.play().catch(() => {}) // ignore autoplay rejections (muted inline should be allowed)
    } else {
      video.pause()
      video.currentTime = 0
    }
  }, [isActive])

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-surface-2 ${className ?? ''}`}
    >
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
        <MediaPlaceholder kind={project.media.kind} />
      )}
    </div>
  )
}

function MediaPlaceholder({ kind }: { kind: ProjectMediaKind }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      {kind === 'video' ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-text-mute">
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
