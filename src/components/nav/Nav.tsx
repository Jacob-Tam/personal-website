import { GitHubIcon, LinkedInIcon } from '../shared/icons'
import { LINKS } from '../../lib/assets'

// Nav links: "work" points at the projects section per docs/02. Smooth-scroll via Lenis is
// wired in Step 7; native anchor jumps are fine for this static step. Hide-on-scroll is Step 7+.
const NAV_LINKS = [
  { label: 'work', href: '#projects' },
  { label: 'about', href: '#about' },
  { label: 'contact', href: '#contact' },
]

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-30">
      <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-12">
        {/* Wordmark placeholder for the JT logo (docs/02). */}
        <a
          href="#hero"
          className="font-medium tracking-tight text-text transition-colors hover:text-accent-hi"
        >
          Jacob Tam
        </a>

        <div className="flex items-center gap-8">
          <ul className="hidden items-center gap-8 sm:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-text-mute transition-colors hover:text-accent-hi"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4">
            <a
              href={LINKS.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="text-text-mute transition-colors hover:text-accent-hi"
            >
              <GitHubIcon className="h-5 w-5" />
            </a>
            <a
              href={LINKS.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="text-text-mute transition-colors hover:text-accent-hi"
            >
              <LinkedInIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </nav>
    </header>
  )
}
