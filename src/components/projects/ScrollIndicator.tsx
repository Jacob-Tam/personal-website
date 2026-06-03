import { useEffect, useRef, useState } from 'react'
import { useScrollStore } from '../../store/useScrollStore'
import { PROJECTS } from './projectsData'

const TRACK = 168 // px height of the dot track
const MARKER = 9 // px marker size

// The journey's "arrived" beats sit at (i + 0.5) / count in projectsProgress; map that span onto the
// full marker track so the marker lands ON dot i exactly when planet i arrives, and slides between.
const FIRST_BEAT = 0.5 / PROJECTS.length
const LAST_BEAT = (PROJECTS.length - 0.5) / PROJECTS.length

/*
  Right-edge scroll indicator for the pinned Projects journey (docs/05): a vertical line of 4 dots (one
  per project) with a blue marker that advances as you travel, the active project's dot lit in the
  accent, and its index in Geist Mono. Driven by the store (projectsProgress + projectsActive), NOT its
  own ScrollTrigger - the section is pinned, so a position-based trigger can't track it. Visible only
  while the pin is engaged; mounted only in the journey (so it's already absent on mobile / reduced
  motion). The marker transform is written straight to the ref each frame (no per-frame re-render);
  only the active index (a handful of changes) touches React state.
*/
export function ScrollIndicator() {
  const markerRef = useRef<HTMLDivElement>(null!)
  const [active, setActive] = useState(0)
  const visible = useScrollStore((state) => state.projectsActive)
  const lastIndex = PROJECTS.length - 1

  useEffect(() => {
    if (!visible) return
    let raf = 0
    const tick = () => {
      const progress = useScrollStore.getState().projectsProgress
      const fraction = Math.min(1, Math.max(0, (progress - FIRST_BEAT) / (LAST_BEAT - FIRST_BEAT)))
      markerRef.current.style.transform = `translateY(${fraction * (TRACK - MARKER)}px)`
      const index = Math.round(fraction * lastIndex)
      setActive((previous) => (previous === index ? previous : index))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, lastIndex])

  return (
    <div
      aria-hidden
      className={`fixed right-8 top-1/2 z-30 -translate-y-1/2 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <span className="font-mono text-label text-accent">{String(active + 1).padStart(2, '0')}</span>
        <div className="relative" style={{ height: TRACK }}>
          <div className="flex h-full flex-col justify-between">
            {PROJECTS.map((project, index) => (
              <span
                key={project.id}
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                  index === active ? 'bg-accent' : 'bg-text-mute/40'
                }`}
              />
            ))}
          </div>
          <div
            ref={markerRef}
            className="absolute left-1/2 top-0 -translate-x-1/2 rounded-[2px] bg-accent shadow-[0_0_8px_var(--color-accent)]"
            style={{ width: MARKER, height: MARKER }}
          />
        </div>
      </div>
    </div>
  )
}
