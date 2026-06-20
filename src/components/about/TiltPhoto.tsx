import { useRef } from 'react'
import { ASSETS, MEDIA_READY } from '../../lib/assets'

const MAX_TILT = 8 // degrees; restrained, tasteful (docs/06), not a toy

/*
  About photo with the cursor-tilt effect (docs/06): rotateX/rotateY follow the pointer over the
  card, easing back on leave. The transform is written straight to the node (no React re-render per
  move). The photo shows in full colour (no duotone). Until MEDIA_READY (lib/assets.ts) the image is
  a 4:5 placeholder block; the tilt still runs.
*/
export function TiltPhoto() {
  const cardRef = useRef<HTMLDivElement>(null!)

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = cardRef.current.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    const rotateY = (px - 0.5) * 2 * MAX_TILT
    const rotateX = -(py - 0.5) * 2 * MAX_TILT
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
  }

  function handlePointerLeave() {
    cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
  }

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl border border-border shadow-2xl shadow-black/50 transition-transform duration-150 ease-out will-change-transform"
    >
      {MEDIA_READY ? (
        <img src={ASSETS.aboutPhoto} alt="Jacob Tam" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-surface">
          <span className="font-mono text-label uppercase text-text-mute">photo · 4:5</span>
        </div>
      )}
    </div>
  )
}
