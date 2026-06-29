import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)

type BackgroundWordProps = { children: string; className?: string; parallax?: number }

/*
  Giant, very faint section word behind the content (docs/06 - the Projects treatment, reused for
  About + Contact). The host section must be `relative overflow-hidden` with the content as a
  positioned layer above. With `parallax` set it scrolls slower than the foreground (docs/05): the
  outer span keeps its positioning/centering transform and the INNER span is animated, so parallax
  never clobbers the centering. Disabled under prefers-reduced-motion.
*/
export function BackgroundWord({ children, className, parallax = 0 }: BackgroundWordProps) {
  const outerRef = useRef<HTMLSpanElement>(null!)
  const innerRef = useRef<HTMLSpanElement>(null!)

  useGSAP(
    () => {
      if (!parallax || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const shift = parallax * 100
      gsap.fromTo(
        innerRef.current,
        { y: -shift },
        {
          y: shift,
          ease: 'none',
          scrollTrigger: {
            trigger: outerRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      )
    },
    { scope: outerRef, dependencies: [parallax] },
  )

  return (
    <span
      ref={outerRef}
      aria-hidden
      className={`pointer-events-none absolute select-none text-[clamp(6rem,22vw,22rem)] font-semibold leading-none tracking-tighter text-text/5 ${className ?? ''}`}
    >
      <span ref={innerRef} className="block">
        {children}
      </span>
    </span>
  )
}
