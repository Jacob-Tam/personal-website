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

// Shared social row (desktop bar + mobile menu).
function SocialLinks({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <GlowLink href={LINKS.github} target="_blank" rel="noreferrer" aria-label="GitHub" className="text-text-mute hover:text-accent-hi">
        <GitHubIcon className="h-5 w-5" />
      </GlowLink>
      <GlowLink href={LINKS.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="text-text-mute hover:text-accent-hi">
        <LinkedInIcon className="h-5 w-5" />
      </GlowLink>
      <GlowLink href={LINKS.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="text-text-mute hover:text-accent-hi">
        <InstagramIcon className="h-5 w-5" />
      </GlowLink>
    </div>
  )
}

export function Nav() {
  // Visible only near the very top; hides once the user scrolls down, reappears at the top
  // (docs/06, and per Jacob's request).
  const [atTop, setAtTop] = useState(true)
  // Mobile only: the hamburger overlay (the inline links are hidden under sm).
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const update = () => setAtTop(window.scrollY < 40)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  // Lock page scroll while the mobile menu is open so the page behind doesn't move under it.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  function smoothScrollTo(event: React.MouseEvent<HTMLAnchorElement>, target: string) {
    event.preventDefault()
    document.body.style.overflow = '' // unlock first so Lenis can scroll the page
    setMenuOpen(false)
    lenis?.scrollTo(target)
  }

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-30 transition-opacity duration-500 ease-out ${
          atTop ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <nav className="flex h-20 w-full items-center justify-end px-6 md:px-12">
          {/* Desktop (sm+): inline section links + social icons. */}
          <div className="hidden items-center gap-8 sm:flex">
            <ul className="flex items-center gap-8">
              <li>
                <GlowLink href={LINKS.resume} target="_blank" rel="noreferrer" className="text-sm text-text-mute hover:text-accent-hi">
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
            <SocialLinks />
          </div>

          {/* Mobile (<sm): hamburger button; the links + socials live in the overlay below. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center text-text-mute transition-colors hover:text-accent-hi sm:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 8h16M4 16h16" />
            </svg>
          </button>
        </nav>
      </header>

      {/* Mobile menu overlay (kept out of the scroll-hidden header so it stays put while open). */}
      <div
        className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-10 bg-bg/95 backdrop-blur-md transition-opacity duration-300 ease-out sm:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
          className="absolute right-6 top-7 flex h-10 w-10 items-center justify-center text-text-mute transition-colors hover:text-accent-hi"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <ul className="flex flex-col items-center gap-7">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <GlowLink
                href={link.href}
                onClick={(event) => smoothScrollTo(event, link.href)}
                className="text-2xl text-text hover:text-accent-hi"
              >
                {link.label}
              </GlowLink>
            </li>
          ))}
          <li>
            <GlowLink href={LINKS.resume} target="_blank" rel="noreferrer" className="text-2xl text-text hover:text-accent-hi">
              resume
            </GlowLink>
          </li>
        </ul>
        <SocialLinks className="mt-2" />
      </div>
    </>
  )
}
