import { useEffect } from 'react'
import { useScrollStore } from '../store/useScrollStore'

/*
  Keeps store.reducedMotion in sync with the OS "reduce motion" setting. The store is already seeded
  synchronously at creation (detectReducedMotion) so the first render is correct and flash-free; this
  just catches a mid-session toggle. When set: the orb goes static, scroll choreography + parallax
  are disabled, reveals are opacity-only, and the loader's shooting stars are dropped (docs/01).
*/
export function useReducedMotion() {
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => useScrollStore.getState().setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
}
