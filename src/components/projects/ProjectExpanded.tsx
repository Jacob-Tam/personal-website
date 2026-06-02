import { useEffect, useRef, useState } from 'react'
import { MEDIA_READY } from '../../lib/assets'
import { lenis } from '../../lib/lenis'
import type { Project } from './projectsData'

/*
  Overlay-style expanded view (NOT a grid reflow, docs/06): larger media + title + full
  description + Geist Mono tech tags, over a dimmed backdrop. Closes on backdrop click, the X,
  or Escape. Background scroll is locked while open (lenis.stop). For the a11y floor: it's a
  labelled modal dialog, focus moves to the close button on open and returns to the triggering
  card on close.
*/
export function ProjectExpanded({ project, onClose }: { project: Project; onClose: () => void }) {
  const [shown, setShown] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true)) // trigger the entrance transition
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)

    // Move focus into the dialog, and restore it to whatever opened the overlay on close.
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    // Lock background scroll while open. Prefer Lenis (the scroll owner); fall back to overflow.
    const previousOverflow = document.body.style.overflow
    if (lenis) lenis.stop()
    else document.body.style.overflow = 'hidden'

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', handleKey)
      if (lenis) lenis.start()
      else document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
      onClick={onClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
    >
      <div aria-hidden className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div
        onClick={(event) => event.stopPropagation()}
        className={`relative z-10 max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl shadow-black/60 transition-all duration-300 ease-out ${shown ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <div className="relative aspect-video w-full bg-surface-2">
          {MEDIA_READY ? (
            project.media.kind === 'video' ? (
              <video src={project.media.src} controls autoPlay muted loop playsInline className="h-full w-full object-cover" />
            ) : (
              <img src={project.media.src} alt={project.media.alt} className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-mono text-label uppercase text-text-mute">
                {project.media.kind === 'video' ? 'video' : 'CAD render'} · placeholder
              </span>
            </div>
          )}

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg/60 text-text-mute backdrop-blur transition-colors hover:border-accent/50 hover:text-accent-hi"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-5 p-8">
          <h3 className="text-h3 text-text">{project.title}</h3>
          <p className="text-body text-text">{project.description}</p>
          <ul className="flex flex-wrap gap-2 pt-2">
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
      </div>
    </div>
  )
}
