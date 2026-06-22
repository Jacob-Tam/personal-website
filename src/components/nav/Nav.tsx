import { useEffect, useState } from 'react'
import { GitHubIcon, InstagramIcon, LinkedInIcon } from '../shared/icons'
import { GlowLink } from '../shared/GlowLink'
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
      className={`fixed inset-x-0 top-0 z-30 transition-opacity duration-500 ease-out ${
        atTop ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <nav className="flex h-20 w-full items-center justify-end px-6 md:px-12">
        <div className="flex items-center gap-8">
          <ul className="hidden items-center gap-8 sm:flex">
            <li>
              <GlowLink
                href={LINKS.resume}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-text-mute hover:text-accent-hi"
              >
                resume
              </GlowLink>
            </li>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <GlowLink
                  href={link.href}
                  onClick={(event) => smoothScrollTo(event, link.href)}
                  className="text-sm text-text-mute hover:text-accent-hi"
                >
                  {link.label}
                </GlowLink>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4">
            <GlowLink
              href={LINKS.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="text-text-mute hover:text-accent-hi"
            >
              <GitHubIcon className="h-5 w-5" />
            </GlowLink>
            <GlowLink
              href={LINKS.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="text-text-mute hover:text-accent-hi"
            >
              <LinkedInIcon className="h-5 w-5" />
            </GlowLink>
            <GlowLink
              href={LINKS.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="text-text-mute hover:text-accent-hi"
            >
              <InstagramIcon className="h-5 w-5" />
            </GlowLink>
          </div>
        </div>
      </nav>
    </header>
  )
}
