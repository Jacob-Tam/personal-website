import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SEED } from '../../lib/constants'

gsap.registerPlugin(ScrollTrigger)

type Geo = {
  width: number
  height: number
  spineX: number
  cards: { cy: number }[]
}

type Particle = { x: number; y: number; revealY: number; r: number; color: string; delay: number }

const PARTICLE_SPACING = 40 // medium, even spacing down the spine
const BIG_PARTICLE_COUNT = 2 // larger "source" particles at the top
const REVEAL_SPAN = 90 // px of scroll-front travel over which a particle fades + slides in
const ENTER_FROM_RIGHT = 80 // px each particle slides in from the right as it reveals

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/*
  Projects "circuit" trace (Jacob's idea, v3). A single vertical stream of small glowing particles
  in the orb palette (steel-blue + ~30% blue-violet, docs/04) runs down the center. As the scroll
  front descends, each particle SLIDES IN FROM THE RIGHT and fades in; when the front reaches a
  card's level the card's border lights up and STAYS lit (latched). No horizontal connector lines.
  The trace starts as the section comes into view - just after the orb has drifted off. Built as an
  SVG overlay (orb canvas is off here); positions measured from the real (staggered) cards. Mounted
  only on wider screens with motion allowed (see Projects). Restrained per docs/01.
*/
export function ProjectsTrace({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [geo, setGeo] = useState<Geo | null>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const measure = () => {
      const base = container.getBoundingClientRect()
      const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-project-card]')).map((card) => {
        const r = card.getBoundingClientRect()
        return { cy: r.top - base.top + r.height / 2 }
      })
      setGeo({ width: base.width, height: base.height, spineX: base.width / 2, cards })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef])

  // Deterministic particle field: an even, medium-spaced column down the spine, plus 1-2 larger
  // particles at the top. Colours match the orb (steel-blue with ~30% blue-violet).
  const particles = useMemo<Particle[]>(() => {
    if (!geo) return []
    const rng = mulberry32(SEED + 7)
    const pickColor = () => {
      const purple = rng() < 0.3
      const hue = purple ? lerp(255, 275, rng()) : lerp(205, 220, rng())
      return `hsl(${hue.toFixed(0)} 80% ${lerp(62, 74, rng()).toFixed(0)}%)`
    }
    const list: Particle[] = []

    const spineCount = Math.max(2, Math.round(geo.height / PARTICLE_SPACING))
    for (let i = 0; i < spineCount; i++) {
      const y = (i / (spineCount - 1)) * geo.height
      list.push({ x: geo.spineX + (rng() - 0.5) * 7, y, revealY: y, r: lerp(1.6, 3.4, rng()), color: pickColor(), delay: rng() * 4 })
    }

    // Larger "source" particles at the very top (pushed last so they render on top).
    for (let i = 0; i < BIG_PARTICLE_COUNT; i++) {
      const y = i * 16
      list.push({ x: geo.spineX + (rng() - 0.5) * 5, y, revealY: y, r: lerp(5, 7, rng()), color: pickColor(), delay: rng() * 4 })
    }
    return list
  }, [geo])

  // Scroll-driven reveal: front descends -> particles slide in from the right + fade in; borders latch.
  useEffect(() => {
    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg || !geo) return

    const groups = Array.from(svg.querySelectorAll<SVGGElement>('[data-particle]'))
    const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-project-card]'))
    const lit = geo.cards.map(() => false)

    const draw = (progress: number) => {
      const frontY = progress * geo.height
      groups.forEach((group, i) => {
        const reveal = Math.min(Math.max((frontY - particles[i].revealY) / REVEAL_SPAN, 0), 1)
        group.style.opacity = `${reveal}`
        group.style.transform = `translateX(${(1 - reveal) * ENTER_FROM_RIGHT}px)`
      })
      geo.cards.forEach((card, i) => {
        if (frontY >= card.cy && !lit[i]) {
          lit[i] = true
          cards[i]?.setAttribute('data-lit', 'true')
        }
      })
    }

    const trigger = ScrollTrigger.create({
      trigger: container,
      start: 'top 70%', // begin as the section comes in - just after the orb has drifted off
      end: 'bottom center',
      scrub: true,
      onUpdate: (self) => draw(self.progress),
    })
    draw(trigger.progress)

    return () => trigger.kill()
  }, [containerRef, geo, particles])

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox={geo ? `0 0 ${geo.width} ${geo.height}` : undefined}
      fill="none"
    >
      {geo && (
        <g style={{ filter: 'drop-shadow(0 0 4px var(--color-accent-hi))' }}>
          {particles.map((p, i) => (
            <g key={i} data-particle={i} style={{ opacity: 0 }}>
              <circle
                className="trace-particle"
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill={p.color}
                style={{ animationDelay: `${p.delay}s` }}
              />
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}
