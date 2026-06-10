import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { MEDIA_READY } from '../../lib/assets'
import { lenis } from '../../lib/lenis'
import type { Project } from './projectsData'

/*
  Full-screen expanded project view, opened by clicking a journey project's MEDIA. The media card
  SPINS + EXPANDS out of its in-place rect into a full-screen takeover with the media on TOP and the
  project text (title, tagline, description, tech) BELOW. The morph is a manual FLIP: measure the
  media's natural (final) rect, derive the single transform that drops it back onto the originating
  card (uniform scale + center-pivot translate, since both are aspect-video), then tween that away
  while spinning a full turn. Backdrop + text fade in behind it; closing reverses the whole thing back
  into the originating card. Background scroll is locked while open (lenis.stop); Escape / the X / the
  backdrop close it. Labelled modal dialog; focus moves to the close button and returns to the opener.
*/
const DURATION = 0.85
const EASE = 'power3.inOut'

export function ProjectExpanded({
  project,
  originRect,
  onClose,
}: {
  project: Project
  originRect: DOMRect
  onClose: () => void
}) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastRectRef = useRef<DOMRect | null>(null)
  const closingRef = useRef(false)

  // The transform that places the full-size media exactly over the originating card. Center pivot so
  // the spin shares it; uniform scale because both cards are aspect-video.
  function transformToOrigin() {
    const last = lastRectRef.current!
    return {
      x: originRect.left + originRect.width / 2 - (last.left + last.width / 2),
      y: originRect.top + originRect.height / 2 - (last.top + last.height / 2),
      scale: originRect.width / last.width,
    }
  }

  function requestClose() {
    if (closingRef.current) return
    closingRef.current = true
    gsap.killTweensOf([mediaRef.current, backdropRef.current, bodyRef.current])
    const to = transformToOrigin()
    const tl = gsap.timeline({ onComplete: onClose })
    tl.to(bodyRef.current, { opacity: 0, y: 18, duration: 0.25, ease: 'power2.in' }, 0)
    tl.to(mediaRef.current, { ...to, rotation: -360, duration: DURATION * 0.8, ease: EASE }, 0)
    tl.to(backdropRef.current, { opacity: 0, duration: 0.4, ease: 'power2.in' }, DURATION * 0.35)
  }

  useLayoutEffect(() => {
    const media = mediaRef.current!
    const backdrop = backdropRef.current!
    const body = bodyRef.current!
    // Clear any leftover transform before measuring so we get the true NATURAL rect. This also makes
    // the effect safe under React StrictMode's double-invoke: the second run would otherwise measure
    // the element while the first run's spin/scale transform is still applied and read a wrong rect.
    gsap.set(media, { clearProps: 'transform' })
    lastRectRef.current = media.getBoundingClientRect()
    const from = transformToOrigin()
    const tl = gsap.timeline()
    tl.fromTo(
      media,
      { ...from, rotation: -360 },
      { x: 0, y: 0, scale: 1, rotation: 0, duration: DURATION, ease: EASE },
      0,
    )
    tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0)
    tl.fromTo(body, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, DURATION * 0.45)

    // a11y + scroll lock. Focus the close button; restore focus to the opener on unmount.
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    if (lenis) lenis.stop()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      window.removeEventListener('keydown', handleKey)
      gsap.killTweensOf([media, backdrop, body])
      if (lenis) lenis.start()
      previouslyFocused?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div role="dialog" aria-modal="true" aria-label={project.title} className="fixed inset-0 z-50 overflow-y-auto">
      <div ref={backdropRef} aria-hidden onClick={requestClose} className="fixed inset-0 bg-bg/95 backdrop-blur-md" />

      <div className="relative flex min-h-full flex-col items-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-4xl">
          <div
            ref={mediaRef}
            className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-2xl shadow-black/60 will-change-transform"
          >
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
              onClick={requestClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg/60 text-text-mute backdrop-blur transition-colors hover:border-accent/50 hover:text-accent-hi"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div ref={bodyRef} className="mx-auto mt-10 max-w-3xl">
            <h3 className="text-h2 text-text">{project.title}</h3>
            <p className="mt-3 text-body-lg text-text-mute">{project.tagline}</p>
            <p className="mt-6 text-body text-text">{project.description}</p>
            <ul className="mt-8 flex flex-wrap gap-2">
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
    </div>
  )
}
