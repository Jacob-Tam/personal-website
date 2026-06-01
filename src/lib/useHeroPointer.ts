import { useEffect } from 'react'
import { useScrollStore } from '../store/useScrollStore'

/*
  A single window pointermove listener, active ONLY in the hero phase (docs/03, docs/04). It
  writes a normalized (-1..1) pointer into the store; the orb reads it in its frame loop via
  getState() (no reactive subscription). y is flipped so +1 is the top of the screen, matching
  the 3D y-up axis, so the orb drifts toward the cursor. When the phase leaves 'hero', the
  listener is removed and the pointer is reset to center so the orb eases back.
*/
export function useHeroPointer() {
  const phase = useScrollStore((state) => state.phase)

  useEffect(() => {
    const { setMouse, lowPower } = useScrollStore.getState()

    // No orb on low-power/mobile (and touch devices have no hovering pointer), so don't listen.
    if (lowPower || phase !== 'hero') {
      setMouse(0, 0)
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1
      const y = -((event.clientY / window.innerHeight) * 2 - 1)
      setMouse(x, y)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [phase])
}
