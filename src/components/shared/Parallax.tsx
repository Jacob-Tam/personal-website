import { useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useScrollStore } from '../../store/useScrollStore'

gsap.registerPlugin(useGSAP, ScrollTrigger)

type ParallaxProps = {
  children: ReactNode
  speed?: number // > 0 scrolls SLOWER than normal (recedes/lags); higher = more lag
  className?: string
}

/*
  Scroll-speed parallax wrapper (docs/05), GSAP + the Lenis-synced ScrollTrigger. Translates the
  inner content from -shift to +shift over its trip through the viewport: net it moves DOWN
  relative to normal, so it appears to scroll slower (a receding/background layer). The trigger is
  the (untransformed) outer div so the animated inner never feeds back into its own measurement.
  Disabled under prefers-reduced-motion and on low-power/mobile (docs/03: no parallax there).
*/
export function Parallax({ children, speed = 0.2, className }: ParallaxProps) {
  const triggerRef = useRef<HTMLDivElement>(null!)
  const innerRef = useRef<HTMLDivElement>(null!)

  useGSAP(
    () => {
      const { lowPower } = useScrollStore.getState()
      if (lowPower || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const shift = speed * 100
      gsap.fromTo(
        innerRef.current,
        { y: -shift },
        {
          y: shift,
          ease: 'none',
          scrollTrigger: {
            trigger: triggerRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      )
    },
    { scope: triggerRef, dependencies: [speed] },
  )

  return (
    <div ref={triggerRef} className={className}>
      <div ref={innerRef}>{children}</div>
    </div>
  )
}
