import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SEED } from '../../lib/constants'

gsap.registerPlugin(ScrollTrigger)

type Geo = {
  width: number
  height: number
  spineX: number
  cards: { cy: number; innerX: number }[]
}

// A particle on the trace: where it sits, the scroll-front depth at which it reveals, plus look.
type Particle = { x: number; y: number; revealY: number; r: number; color: string; delay: number }

const SPINE_COUNT = 16
const BRANCH_COUNT = 4
const REVEAL_SPAN = 90 // px of scroll-front travel over which a particle fades in

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
  Projects "circuit" trace (Jacob's idea, v2). A stream of small glowing particles - the same
  blue/blue-violet family as the orb's orbiting particles (docs/04) - runs down the center and
  branches out to each card. As you scroll, the front descends and the particles FADE IN as it
  passes them (so the line is made of particles, not a solid stroke); when the front reaches a card
  its branch + border light up and STAY lit (latched). Built as an SVG overlay since the orb canvas
  is off here; positions measured from the real (staggered) cards. Mounted only on wider screens
  with motion allowed (see Projects). Kept restrained per docs/01.
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
        const cy = r.top - base.top + r.height / 2
        const center = r.left - base.left + r.width / 2
        const innerX = center < base.width / 2 ? r.right - base.left : r.left - base.left
        return { cy, innerX }
      })
      setGeo({ width: base.width, height: base.height, spineX: base.width / 2, cards })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef])

  // Deterministic particle field: a column down the spine + a few along each branch. Colours match
  // the orb (steel-blue with ~30% blue-violet). revealY = the scroll-front depth at which it appears
  // (its own y on the spine; the card's cy for branch particles, so a branch lights with its card).
  const particles = useMemo<Particle[]>(() => {
    if (!geo) return []
    const rng = mulberry32(SEED + 7)
    const pickColor = () => {
      const purple = rng() < 0.3
      const hue = purple ? lerp(255, 275, rng()) : lerp(205, 220, rng())
      return `hsl(${hue.toFixed(0)} 80% ${lerp(62, 74, rng()).toFixed(0)}%)`
    }
    const list: Particle[] = []
    for (let i = 0; i < SPINE_COUNT; i++) {
      const y = (i / (SPINE_COUNT - 1)) * geo.height
      list.push({
        x: geo.spineX + (rng() - 0.5) * 7,
        y,
        revealY: y,
        r: lerp(1.6, 3.4, rng()),
        color: pickColor(),
        delay: rng() * 4,
      })
    }
    geo.cards.forEach((card) => {
      for (let i = 0; i < BRANCH_COUNT; i++) {
        const t = (i + 1) / (BRANCH_COUNT + 1)
        list.push({
          x: lerp(geo.spineX, card.innerX, t) + (rng() - 0.5) * 4,
          y: card.cy + (rng() - 0.5) * 6,
          revealY: card.cy,
          r: lerp(1.6, 3.2, rng()),
          color: pickColor(),
          delay: rng() * 4,
        })
      }
    })
    return list
  }, [geo])

  // Scroll-driven reveal: the front descends, particles fade in as it passes, branch + border latch.
  useEffect(() => {
    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg || !geo) return

    const dots = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-particle]'))
    const branches = Array.from(svg.querySelectorAll<SVGPathElement>('[data-branch]'))
    const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-project-card]'))
    const lit = geo.cards.map(() => false)

    const draw = (progress: number) => {
      const frontY = progress * geo.height
      dots.forEach((dot, i) => {
        const reveal = Math.min(Math.max((frontY - particles[i].revealY) / REVEAL_SPAN, 0), 1)
        dot.style.opacity = `${reveal}`
      })
      geo.cards.forEach((card, i) => {
        if (frontY >= card.cy && !lit[i]) {
          lit[i] = true
          branches[i]?.classList.add('is-lit')
          cards[i]?.setAttribute('data-lit', 'true')
        }
      })
    }

    const trigger = ScrollTrigger.create({
      trigger: container,
      start: 'top center',
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
        <>
          {/* faint branch guides; brighten when their card lights */}
          {geo.cards.map((card, i) => (
            <path
              key={i}
              data-branch={i}
              d={`M ${geo.spineX} ${card.cy} L ${card.innerX} ${card.cy}`}
              className="stroke-border transition-[stroke] duration-500 [&.is-lit]:stroke-accent/50"
              strokeWidth={1}
            />
          ))}
          {/* the stream of glowing particles (orb palette) */}
          <g style={{ filter: 'drop-shadow(0 0 4px var(--color-accent-hi))' }}>
            {particles.map((p, i) => (
              <circle
                key={i}
                data-particle={i}
                className="trace-particle"
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill={p.color}
                style={{ opacity: 0, animationDelay: `${p.delay}s` }}
              />
            ))}
          </g>
        </>
      )}
    </svg>
  )
}
