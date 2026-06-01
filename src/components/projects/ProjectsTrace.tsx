import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

type Geo = {
  width: number
  height: number
  spineX: number
  cards: { cy: number; innerX: number }[]
}

const DOT_COUNT = 5
const DOT_SPACING = 24 // gap between trailing dots, in layout px

/*
  Circuit-style scroll trace for the Projects section (Jacob's idea). A center spine draws downward
  as you scroll, glowing dots descend at its front, and a branch reaches each project card; when the
  front passes a card the branch + the card's border light up and STAY lit (cumulative). Built as an
  SVG overlay (the 3D orb canvas is off by this section), measured from real card positions
  (getBoundingClientRect relative to the container) and re-measured on resize. Mounted only on
  wider screens with motion allowed (see Projects).
*/
export function ProjectsTrace({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [geo, setGeo] = useState<Geo | null>(null)

  // Measure the grid container + each card in container-local coords. offset* ignores CSS
  // transforms, so the Reveal slide-in does not throw the positions off. Re-measure on resize.
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

  // Scroll-driven draw. Spine + dots are scrubbed (they follow the scroll both ways); the borders
  // LATCH on (they stay lit once the front reaches them), per Jacob.
  useEffect(() => {
    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg || !geo) return

    const spine = svg.querySelector<SVGLineElement>('[data-spine]')
    const branches = Array.from(svg.querySelectorAll<SVGPathElement>('[data-branch]'))
    const dots = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-dot]'))
    const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-project-card]'))
    const lit = geo.cards.map(() => false)
    if (!spine) return

    const spineLength = geo.height
    spine.style.strokeDasharray = `${spineLength}`

    const draw = (progress: number) => {
      const frontY = progress * geo.height
      spine.style.strokeDashoffset = `${spineLength * (1 - progress)}`

      dots.forEach((dot, i) => {
        const y = frontY - i * DOT_SPACING
        dot.setAttribute('cy', `${y}`)
        dot.style.opacity = progress <= 0.001 || y < 0 ? '0' : `${Math.max(0, 1 - i * 0.22)}`
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
  }, [containerRef, geo])

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
          {geo.cards.map((card, i) => (
            <path
              key={i}
              data-branch={i}
              d={`M ${geo.spineX} ${card.cy} L ${card.innerX} ${card.cy}`}
              className="stroke-border transition-[stroke] duration-500 [&.is-lit]:stroke-accent"
              strokeWidth={1.5}
            />
          ))}
          <line
            data-spine
            x1={geo.spineX}
            y1={0}
            x2={geo.spineX}
            y2={geo.height}
            className="stroke-accent/60"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <g style={{ filter: 'drop-shadow(0 0 5px var(--color-accent-hi))' }}>
            {Array.from({ length: DOT_COUNT }).map((_, i) => (
              <circle
                key={i}
                data-dot={i}
                cx={geo.spineX}
                cy={0}
                r={i === 0 ? 3.5 : 2.5}
                className="fill-accent-hi"
                style={{ opacity: 0 }}
              />
            ))}
          </g>
        </>
      )}
    </svg>
  )
}
