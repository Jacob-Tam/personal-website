import type { AnchorHTMLAttributes, CSSProperties } from 'react'

// A few small accent particles that spit outward on hover, echoing the hero start-circle orb sparks
// (index.css .link-spark). Tuned small + close for nav icons / contact links.
const SPARKS = [
  { x: '-15px', y: '-11px', d: '0s' },
  { x: '15px', y: '-13px', d: '0.1s' },
  { x: '16px', y: '8px', d: '0.2s' },
  { x: '-4px', y: '16px', d: '0.3s' },
  { x: '-16px', y: '5px', d: '0.4s' },
]

// Drop-in <a> that glows and emits a few sparks on hover (nav social icons, contact links). Forwards
// every anchor prop (href, target, rel, aria-label, onClick, className). Styling lives in index.css
// (.glow-link / .link-spark); the sparks are decorative and disabled under reduced motion.
export function GlowLink({ className = '', children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`glow-link ${className}`} {...props}>
      {children}
      {SPARKS.map((spark, index) => (
        <span
          key={index}
          aria-hidden
          className="link-spark"
          style={{ '--x': spark.x, '--y': spark.y, '--d': spark.d } as CSSProperties}
        />
      ))}
    </a>
  )
}
