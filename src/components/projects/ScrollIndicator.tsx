import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { PROJECTS } from './projectsData'

gsap.registerPlugin(ScrollTrigger)

const TRACK = 168 // px height of the dot track
const MARKER = 9 // px marker size

/*
  sui.io-style scroll indicator for the Projects section (docs/05): a vertical line of dim dots
  (one per project) with a blue marker that moves down as you scroll through the projects, plus the
  active project's index in Geist Mono. Anchored on the RIGHT (the particle trace owns the center).
  Fades in while the projects are in view, out when they leave. Only mounted on wider screens with
  motion allowed (see Projects) - so it's already off on mobile / under reduced motion.
*/
export function ScrollIndicator() {
  const markerRef = useRef<HTMLDivElement>(null!)
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(false)
  const lastIndex = PROJECTS.length - 1

  useEffect(() => {
    const section = document.getElementById('projects')
    if (!section) return
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onUpdate: (self) => {
        markerRef.current.style.transform = `translateY(${self.progress * (TRACK - MARKER)}px)`
        const index = Math.min(lastIndex, Math.max(0, Math.round(self.progress * lastIndex)))
        setActive((prev) => (prev === index ? prev : index))
      },
      onToggle: (self) => setVisible(self.isActive),
    })
    return () => trigger.kill()
  }, [lastIndex])

  return (
    <div
      className={`fixed right-8 top-1/2 z-30 -translate-y-1/2 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <span className="font-mono text-label text-accent">{String(active + 1).padStart(2, '0')}</span>
        <div className="relative" style={{ height: TRACK }}>
          <div className="flex h-full flex-col justify-between">
            {PROJECTS.map((project) => (
              <span key={project.id} className="h-1.5 w-1.5 rounded-full bg-text-mute/40" />
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
