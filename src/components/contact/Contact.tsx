import { Reveal } from '../shared/Reveal'
import { BackgroundWord } from '../shared/BackgroundWord'
import { MoonSurface } from '../shared/MoonSurface'
import { LINKS } from '../../lib/assets'

// Contact / footer (verbatim copy, docs/02). Calm, lots of space, blue only on hover.
export function Contact() {
  return (
    <section id="contact" className="relative flex min-h-svh items-center justify-center overflow-hidden px-6 text-center">
      {/* A grey planet limb rotates slowly at the bottom of the section. */}
      <MoonSurface />
      <BackgroundWord className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" parallax={0.4}>CONTACT</BackgroundWord>
      <Reveal className="relative flex flex-col items-center gap-10" stagger={0.1}>
        <h2 className="text-h2 text-text">Get in touch</h2>

        <a
          href={`mailto:${LINKS.email}`}
          className="text-body-lg text-text-mute transition-colors hover:text-accent-hi"
        >
          {LINKS.email}
        </a>

        <div className="flex items-center gap-6 font-mono text-label uppercase">
          <a href={LINKS.github} target="_blank" rel="noreferrer" className="text-text-mute transition-colors hover:text-accent-hi">
            github
          </a>
          <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="text-text-mute transition-colors hover:text-accent-hi">
            linkedin
          </a>
          <a href={LINKS.instagram} target="_blank" rel="noreferrer" className="text-text-mute transition-colors hover:text-accent-hi">
            instagram
          </a>
          <a href={LINKS.resume} target="_blank" rel="noreferrer" className="text-text-mute transition-colors hover:text-accent-hi">
            resume
          </a>
        </div>

        <p className="mt-16 font-mono text-label text-text-mute">
          © 2026 Jacob Tam. Made with too many Mango Loco Monsters.
        </p>
      </Reveal>
    </section>
  )
}
