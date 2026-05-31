import { useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)

type RevealProps = {
  children: ReactNode
  className?: string
  y?: number
  delay?: number
  stagger?: number // when set, the direct children are revealed in sequence
}

/*
  Fade + slide-up on enter (docs/05), cinematic ease-out. With `stagger`, the wrapper's direct
  children animate in sequence (e.g. the About paragraphs). Under prefers-reduced-motion the
  content just appears (opacity-only, no transform), which is a hard requirement (docs/01).
*/
export function Reveal({ children, className, y = 24, delay = 0, stagger }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null!)

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const targets = stagger != null ? Array.from(ref.current.children) : ref.current

      if (reduceMotion) {
        gsap.set(targets, { opacity: 1, y: 0 })
        return
      }

      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: 'power3.out',
          delay,
          stagger: stagger ?? 0,
          scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
        },
      )
    },
    { scope: ref },
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
