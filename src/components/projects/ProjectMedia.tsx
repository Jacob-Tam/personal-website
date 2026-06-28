import { useEffect, useRef } from 'react'
import type { Project, ProjectMediaKind } from './projectsData'

/*
  The LEFT-side media panel for a project (journey + flat fallback). A 2D/DOM layer in front of the
  canvas - NOT a video texture in Three.js - so media quality stays high. Until this project's
  media.ready is set it's a placeholder poster; real files drop into /public/media with no code
  change (just flip that project's `ready` in projectsData). Only the ACTIVE project's
  clip plays (`isActive`, set by the journey as each planet arrives); the rest stay paused at the start
  (preload none -> the four never autoplay at once, docs/03). isActive is undefined in the flat
  fallback, so nothing autoplays on mobile - but `controls` is passed there so a visitor can play it.
*/
export function ProjectMedia({
  project,
  isActive,
  controls,
  className,
}: {
  project: Project
  isActive?: boolean
  controls?: boolean
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const start = project.media.cardStart ?? 0 // where the card preview begins + loops

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    // Seek to the card-start mark once the metadata is in (preload="none" defers it until play). Doing
    // it before the first frame paints avoids a flash of 0:00 before jumping to the highlight.
    const seekToStart = () => {
      video.currentTime = start
    }
    if (isActive) {
      if (video.readyState >= 1) seekToStart()
      else video.addEventListener('loadedmetadata', seekToStart, { once: true })
      video.play().catch(() => {}) // ignore autoplay rejections (muted inline should be allowed)
      return () => video.removeEventListener('loadedmetadata', seekToStart)
    }
    video.pause()
    if (video.readyState >= 1) video.currentTime = start
  }, [isActive, start])

  // Loop from the card-start mark (not 0) so the preview keeps replaying the highlight, not the intro.
  function handleEnded() {
    const video = videoRef.current
    if (!video) return
    video.currentTime = start
    video.play().catch(() => {})
  }

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden bg-surface-2 ${className ?? ''}`}
    >
      {project.media.ready ? (
        project.media.kind === 'video' ? (
          <video
            ref={videoRef}
            src={project.media.src}
            muted
            playsInline
            controls={controls}
            preload="none"
            onEnded={handleEnded}
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
