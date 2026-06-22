import type { AnchorHTMLAttributes, CSSProperties } from 'react'

// A few small accent particles that spit outward on hover, echoing the hero start-circle orb sparks
// (index.css .link-spark). Tuned small + close for nav icons / contact links.
const SPARKS = [
  { x: '-22px', y: '-16px', d: '0s' },
  { x: '21px', y: '-19px', d: '0.08s' },
  { x: '25px', y: '6px', d: '0.16s' },
  { x: '9px', y: '23px', d: '0.24s' },
  { x: '-13px', y: '22px', d: '0.32s' },
  { x: '-25px', y: '7px', d: '0.4s' },
  { x: '3px', y: '-25px', d: '0.48s' },
]

// The spark spans. Drop inside any element carrying the `.glow-link` class to make it emit particles
// on hover (GlowLink, or e.g. a heading). Decorative; disabled under reduced motion (index.css).
export function Sparks() {
  return (
    <>
      {SPARKS.map((spark, index) => (
        <span
          key={index}
          aria-hidden
          className="link-spark"
          style={{ '--x': spark.x, '--y': spark.y, '--d': spark.d } as CSSProperties}
        />
      ))}
    </>
  )
}

// Drop-in <a> that glows and emits a few sparks on hover (nav social icons, contact links). Forwards
// every anchor prop (href, target, rel, aria-label, onClick, className). Styling lives in index.css
// (.glow-link / .link-spark).
export function GlowLink({ className = '', children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`glow-link ${className}`} {...props}>
      {children}
      <Sparks />
    </a>
  )
}
