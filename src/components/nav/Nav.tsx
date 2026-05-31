import { useEffect, useState } from 'react'
import { GitHubIcon, LinkedInIcon } from '../shared/icons'
import { LINKS } from '../../lib/assets'
import { lenis } from '../../lib/lenis'

// "work" points at the projects section per docs/02.
const NAV_LINKS = [
  { label: 'work', href: '#projects' },
  { label: 'about', href: '#about' },
  { label: 'contact', href: '#contact' },
]

export function Nav() {
  // Visible only near the very top; hides once the user scrolls down, reappears at the top
  // (docs/06, and per Jacob's request).
  const [atTop, setAtTop] = useState(true)

  useEffect(() => {
    const update = () => setAtTop(window.scrollY < 40)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  function smoothScrollTo(event: React.MouseEvent<HTMLAnchorElement>, target: string) {
    event.preventDefault()
    lenis?.scrollTo(target)
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 transition-[transform,opacity] duration-500 ease-out ${
        atTop ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'
      }`}
    >
      <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-12">
        {/* Wordmark placeholder for the JT logo (docs/02). */}
        <a
          href="#hero"
          onClick={(event) => smoothScrollTo(event, '#hero')}
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
                  onClick={(event) => smoothScrollTo(event, link.href)}
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
