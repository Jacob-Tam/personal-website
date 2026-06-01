import { useRef, useState } from 'react'
import { Leva } from 'leva'

const PANEL_WIDTH = 256

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/*
  DEV-only wrapper around the leva panel. A drag handle repositions it; leva's own title bar is the
  collapse toggle and starts collapsed (`collapsed`) so the whole panel is CLOSED by default. The
  controls live in a height-capped, scrollable area (visible scrollbar). leva stays mounted and
  visible (so `fill` measures correctly and leva doesn't spawn its own default panel). Folders are
  collapsed by default too (see the useControls settings in Scene). Never shipped.
*/
export function DevPanel() {
  const [pos, setPos] = useState(() => ({
    x: Math.max(8, Math.round(window.innerWidth / 2 - PANEL_WIDTH / 2)),
    y: 8,
  }))
  const grab = useRef({ x: 0, y: 0 })

  function handleDragStart(event: React.PointerEvent) {
    grab.current = { x: event.clientX - pos.x, y: event.clientY - pos.y }
    const handleMove = (e: PointerEvent) => {
      setPos({
        x: clamp(e.clientX - grab.current.x, 0, window.innerWidth - PANEL_WIDTH),
        y: clamp(e.clientY - grab.current.y, 0, window.innerHeight - 48),
      })
    }
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  return (
    <div className="fixed z-50" style={{ left: pos.x, top: pos.y, width: PANEL_WIDTH }}>
      <div className="overflow-hidden rounded-md border border-border bg-[#181c20] shadow-xl">
        <div
          onPointerDown={handleDragStart}
          className="flex cursor-grab select-none items-center gap-2 px-2.5 py-1.5 font-mono text-[0.7rem] uppercase tracking-wider text-text-mute active:cursor-grabbing"
        >
          <span aria-hidden>⠿</span> drag
        </div>
        <div className="dev-scroll max-h-[78vh] overflow-y-auto">
          <Leva fill flat collapsed titleBar={{ drag: false, title: 'orb controls' }} />
        </div>
      </div>
    </div>
  )
}
