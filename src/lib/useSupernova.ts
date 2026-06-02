import { useEffect } from 'react'
import { useScrollStore } from '../store/useScrollStore'

/*
  Easter egg: typing "67" sets off the orb supernova (a bright flash + particle burst that re-forms).
  Tracks recent keystrokes and fires on the "6" -> "7" sequence; ignores text fields, modifier
  combos, and reduced motion. The orb reads store.supernovaAt in its frame loop.
*/
export function useSupernova() {
  useEffect(() => {
    let recent = ''
    let last = 0
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || event.metaKey || event.ctrlKey || event.altKey) return
      const now = performance.now()
      if (now - last > 1500) recent = '' // a stale, slow sequence resets
      last = now
      if (event.key.length === 1) recent = (recent + event.key).slice(-3)
      if (recent.endsWith('67')) {
        recent = ''
        const store = useScrollStore.getState()
        if (!store.reducedMotion) store.triggerSupernova()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
