import { Reveal } from '../shared/Reveal'
import { BackgroundWord } from '../shared/BackgroundWord'
import { TiltPhoto } from './TiltPhoto'

// Three short paragraphs, VERBATIM from docs/02. Revealed staggered as the section enters.
const PARAGRAPHS = [
  "I'm a fourth-year electrical engineering student at Queen's and a member of the varsity tennis team. Most of what I work on lives at the intersection of embedded systems, computer vision, and figuring out how to make hardware do something useful.",
  'Currently an AMIO Support intern at Hydro One, working with the meters that monitor power usage across Ontario. Last summer I was a software dev at Forum Asset Management, where I built internal tools including a LinkedIn bot that auto-generates company posts and a dynamic pricing engine for real estate listings.',
  "When I'm not in the lab I'm on a tennis court or trying to recreate a restaurant dish I had once and never wrote down.",
]

export function About() {
  return (
    <section id="about" className="relative flex min-h-svh items-center overflow-hidden px-6 py-24 md:px-12">
      <BackgroundWord className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">ABOUT</BackgroundWord>
      <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 md:grid-cols-2 md:gap-16">
        <Reveal className="flex flex-col gap-6" stagger={0.12}>
          {PARAGRAPHS.map((paragraph, index) => (
            <p key={index} className="max-w-prose text-body text-text">
              {paragraph}
            </p>
          ))}
        </Reveal>
        <Reveal className="flex justify-center md:justify-end">
          <TiltPhoto />
        </Reveal>
      </div>
    </section>
  )
}
