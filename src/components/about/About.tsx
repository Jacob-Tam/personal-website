import { TiltPhoto } from './TiltPhoto'

// Three short paragraphs, VERBATIM from docs/02. Staggered reveal-on-enter is Step 7.
const PARAGRAPHS = [
  "I'm a fourth-year electrical engineering student at Queen's and a member of the varsity tennis team. Most of what I work on lives at the intersection of embedded systems, computer vision, and figuring out how to make hardware do something useful.",
  'Currently an AMIO Support intern at Hydro One, working with the meters that monitor power usage across Ontario. Last summer I was a software dev at Forum Asset Management, where I built internal tools including a LinkedIn bot that auto-generates company posts and a dynamic pricing engine for real estate listings.',
  "When I'm not in the lab I'm on a tennis court or trying to recreate a restaurant dish I had once and never wrote down.",
]

export function About() {
  return (
    <section id="about" className="flex min-h-svh items-center px-6 py-24 md:px-12">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-12 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-6">
          {PARAGRAPHS.map((paragraph, index) => (
            <p key={index} className="max-w-prose text-body text-text">
              {paragraph}
            </p>
          ))}
        </div>
        <div className="flex justify-center md:justify-end">
          <TiltPhoto />
        </div>
      </div>
    </section>
  )
}
