import { LINKS } from '../../lib/assets'

// Contact / footer (verbatim copy, docs/02). Calm, lots of space, blue only on hover.
export function Contact() {
  return (
    <section
      id="contact"
      className="flex min-h-svh flex-col items-center justify-center gap-10 px-6 text-center"
    >
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
        <a href={LINKS.resume} target="_blank" rel="noreferrer" className="text-text-mute transition-colors hover:text-accent-hi">
          resume
        </a>
      </div>

      <p className="mt-16 font-mono text-label text-text-mute">
        © 2026 Jacob Tam. Made with too many Mango Loco Monsters.
      </p>
    </section>
  )
}
