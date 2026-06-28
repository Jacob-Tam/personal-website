import { useRef, useState } from 'react'
import { Leva } from 'leva'
import { useScrollStore } from '../../store/useScrollStore'

const PANEL_WIDTH = 360 // wide enough that control labels aren't truncated to "lum..." / "pur..."
const HANDLE_HEIGHT = 34 // the custom "drag" bar above the leva panel
const MARGIN = 16

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

// leva theme tuned to the site palette (lib tokens in index.css :root) so the panel reads as part of
// the site: dark navy surfaces, the blue accent on controls, Geist Mono labels.
const levaTheme = {
  colors: {
    elevation1: '#0b1118', // panel background (= --color-surface-2, matches the container)
    elevation2: '#0e141b', // rows / folders
    elevation3: '#11171f', // inputs / widgets
    accent1: '#1f4666', // --color-accent-lo
    accent2: '#4489b7', // --color-accent
    accent3: '#6bb0dc', // --color-accent-hi (hover / active)
    highlight1: '#797b80', // dimmed text (= --color-text-mute)
    highlight2: '#c9ccd2', // labels
    highlight3: '#fcfcfc', // active values (= --color-text)
    vivid: '#6bb0dc',
  },
  fonts: {
    mono: '"Geist Mono Variable", ui-monospace, "SF Mono", monospace',
    sans: '"Geist Variable", ui-sans-serif, system-ui, sans-serif',
  },
  radii: { xs: '2px', sm: '6px', lg: '8px' },
  fontSizes: { root: '12px' },
}

/*
  DEV-only wrapper around the leva panel. A drag handle repositions it; leva's own title bar is the
  collapse toggle and starts collapsed (`collapsed`) so the whole panel is CLOSED by default, and
  every folder starts collapsed too (see the useControls settings in Scene). The controls live in a
  scrollable area whose height tracks the panel's position, so however far down it's dragged it never
  runs past the bottom of the screen and the scrollbar stays reachable. leva stays mounted/visible
  (so `fill` measures correctly and leva doesn't spawn its own default panel). Never shipped.
*/
export function DevPanel() {
  const mobile = useScrollStore((state) => state.mobile)
  // On phones the panel is narrower and parks top-left (out of the way); it starts collapsed (just the
  // title bar) so it doesn't cover content, and the title bar expands it when you want to tune.
  const panelWidth = mobile ? Math.min(280, window.innerWidth - 16) : PANEL_WIDTH
  const [pos, setPos] = useState(() => ({
    x: mobile ? 8 : Math.max(8, Math.round(window.innerWidth / 2 - PANEL_WIDTH / 2)),
    y: 8,
  }))
  const grab = useRef({ x: 0, y: 0 })

  function handleDragStart(event: React.PointerEvent) {
    grab.current = { x: event.clientX - pos.x, y: event.clientY - pos.y }
    const handleMove = (e: PointerEvent) => {
      setPos({
        x: clamp(e.clientX - grab.current.x, 0, window.innerWidth - panelWidth),
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

  // Cap the scroll area to the room below the handle (and never more than ~82vh), so a tall stack
  // of open folders scrolls inside the panel instead of running off the bottom of the viewport.
  const maxBodyHeight = Math.min(
    window.innerHeight * 0.82,
    window.innerHeight - pos.y - HANDLE_HEIGHT - MARGIN,
  )

  return (
    <div className="fixed z-50" style={{ left: pos.x, top: pos.y, width: panelWidth }}>
      <div className="overflow-hidden rounded-md border border-border bg-surface-2 shadow-xl">
        <div
          onPointerDown={handleDragStart}
          className="flex cursor-grab select-none items-center gap-2 px-2.5 py-1.5 font-mono text-[0.7rem] uppercase tracking-wider text-text-mute active:cursor-grabbing"
        >
          <span aria-hidden>⠿</span> drag
        </div>
        <div className="dev-scroll overflow-y-auto" style={{ maxHeight: maxBodyHeight }}>
          <Leva fill flat collapsed titleBar={{ drag: false, title: 'controls' }} theme={levaTheme} />
        </div>
      </div>
    </div>
  )
}
