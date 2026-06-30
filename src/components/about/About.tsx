import { Reveal } from '../shared/Reveal'
import { BackgroundWord } from '../shared/BackgroundWord'
import { Parallax } from '../shared/Parallax'
import { TiltPhoto } from './TiltPhoto'

// Three short paragraphs, VERBATIM from docs/02. Revealed staggered as the section enters.
const PARAGRAPHS = [
  "I'm a fourth-year electrical engineering student at Queen's and a member of the varsity tennis team. Most of my work lives at the intersection of embedded systems and computer vision, turning complex data into real-world hardware solutions.",
  'Currently on a 16-month internship at Hydro One in Toronto, working on the meters and systems that monitor power usage across Ontario. Last summer I was a software dev at Forum Asset Management, where I built internal tools and external-facing AI, including an agentic chatbot for an affiliated non-profit, a LinkedIn bot that auto-generates company posts, and a dynamic pricing engine for real estate listings.',
  "When I'm not in the lab I'm on the tennis court or trying to recreate a dish I saw on reels.",
]

export function About() {
  return (
    <section id="about" className="relative flex min-h-svh items-center overflow-hidden px-6 py-24 md:px-12">
      {/* Mobile: the orb drifts up through the full-width text and washes it out. A scrim dims whatever's
          behind the section (orb/planets) so the copy stays readable. Desktop's 2-col layout keeps the orb
          in the gap, so it's not needed there (md:hidden). */}
      <div aria-hidden className="absolute inset-0 bg-bg/80 md:hidden" />
      <BackgroundWord className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" parallax={0.4}>ABOUT</BackgroundWord>
      <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 md:grid-cols-2 md:gap-16">
        <Reveal className="flex flex-col gap-6" stagger={0.12}>
          {PARAGRAPHS.map((paragraph, index) => (
            <p key={index} className="max-w-prose text-body text-text">
              {paragraph}
            </p>
          ))}
        </Reveal>
        <Reveal className="order-first flex justify-center md:order-none md:justify-end">
          <Parallax speed={0.15} className="w-full max-w-sm">
            <TiltPhoto />
          </Parallax>
        </Reveal>
      </div>
    </section>
  )
}
