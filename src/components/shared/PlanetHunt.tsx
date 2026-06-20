import { useEffect, useRef, useState } from 'react'
import { lenis } from '../../lib/lenis'

/*
  Easter-egg mini-game (triggered from Planets.tsx when all three background planets are lit at once).
  A tiny saucer - cousin of the drifting Spaceship - that you fly with the MOUSE or the ARROW KEYS
  (WASD too). It auto-fires in its heading; sweep the heading across the three planets (or just ram
  them) to blow them all up. Clear them to win; Esc bails out.

  Graphics (ship, bullets, explosions, reticles) are drawn on a transparent full-screen <canvas> so the
  per-frame motion never re-renders React. The planets stay their real DOM elements (Planets raises them
  above the dim backdrop during play); we read their live rects each frame for aiming + collisions, and
  call onKill(i) to make Planets pop each one. Scroll is locked (lenis.stop) for the duration.
*/

const SHIP = {
  cursorLerp: 0.14, // how hard the ship chases the cursor
  accel: 0.85, // arrow-key acceleration (px/frame^2-ish)
  friction: 0.9, // velocity damping for key control
  maxSpeed: 13,
  nose: 14, // bullet spawn offset from centre
}
const BULLET = { speed: 640, radius: 3, cadenceMs: 110, life: 1.1 }
const PLANET_HP = 6
const RAM_DPS = 9 // hp/sec drained while the ship overlaps a planet
const WIN_HOLD_MS = 2000
const ACCENT = '120, 200, 245'

type Bullet = { x: number; y: number; vx: number; vy: number; life: number }
type Boom = { x: number; y: number; t: number; big: boolean }

export function PlanetHunt({
  planetEls,
  onKill,
  onEnd,
}: {
  planetEls: (HTMLElement | null)[]
  onKill: (index: number) => void
  onEnd: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      // CSS size = viewport (1x), backing buffer = 2x for crispness. Both are needed: without the
      // explicit CSS size the canvas falls back to its buffer size and renders at 2x, off-screen.
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const ship = { x: window.innerWidth / 2, y: window.innerHeight * 0.82, vx: 0, vy: 0, angle: -Math.PI / 2 }
    const mouse = { x: ship.x, y: ship.y, active: false }
    const keys = { up: false, down: false, left: false, right: false }
    const bullets: Bullet[] = []
    const booms: Boom[] = []
    const hp = planetEls.map(() => PLANET_HP)
    let lastFire = 0
    let ended = false
    let wonAt = 0
    let raf = 0

    const finish = () => {
      if (ended) return
      ended = true
      onEnd()
    }

    const onPointerMove = (event: PointerEvent) => {
      mouse.x = event.clientX
      mouse.y = event.clientY
      mouse.active = true
    }
    const setKey = (event: KeyboardEvent, down: boolean) => {
      const k = event.key.toLowerCase()
      if (k === 'arrowup' || k === 'w') keys.up = down
      else if (k === 'arrowdown' || k === 's') keys.down = down
      else if (k === 'arrowleft' || k === 'a') keys.left = down
      else if (k === 'arrowright' || k === 'd') keys.right = down
      else if (k === 'escape' && down) finish()
      else return
      event.preventDefault()
      if (down) mouse.active = false // a key press hands control back to the keyboard
    }
    const onKeyDown = (e: KeyboardEvent) => setKey(e, true)
    const onKeyUp = (e: KeyboardEvent) => setKey(e, false)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('resize', resize)
    if (lenis) lenis.stop()
    const hintTimer = window.setTimeout(() => setShowHint(false), 3600)

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const W = window.innerWidth
      const H = window.innerHeight
      const won = wonAt > 0

      // --- movement ---
      if (!won) {
        if (mouse.active) {
          ship.vx = (mouse.x - ship.x) * SHIP.cursorLerp
          ship.vy = (mouse.y - ship.y) * SHIP.cursorLerp
        } else {
          const ax = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
          const ay = (keys.down ? 1 : 0) - (keys.up ? 1 : 0)
          ship.vx = (ship.vx + ax * SHIP.accel) * SHIP.friction
          ship.vy = (ship.vy + ay * SHIP.accel) * SHIP.friction
        }
        const speed = Math.hypot(ship.vx, ship.vy)
        if (speed > SHIP.maxSpeed) {
          ship.vx = (ship.vx / speed) * SHIP.maxSpeed
          ship.vy = (ship.vy / speed) * SHIP.maxSpeed
        }
        ship.x = clamp(ship.x + ship.vx, 8, W - 8)
        ship.y = clamp(ship.y + ship.vy, 8, H - 8)
        if (speed > 0.5) ship.angle = Math.atan2(ship.vy, ship.vx)
      }

      // --- live target rects (alive planets only) ---
      const targets = planetEls.map((el, i) => {
        if (!el || hp[i] <= 0) return null
        const r = el.getBoundingClientRect()
        return { i, cx: r.left + r.width / 2, cy: r.top + r.height / 2, rad: Math.max(r.width, r.height) / 2 + 16 }
      })

      // --- fire ---
      if (!won && now - lastFire > BULLET.cadenceMs) {
        lastFire = now
        bullets.push({
          x: ship.x + Math.cos(ship.angle) * SHIP.nose,
          y: ship.y + Math.sin(ship.angle) * SHIP.nose,
          vx: Math.cos(ship.angle) * BULLET.speed,
          vy: Math.sin(ship.angle) * BULLET.speed,
          life: BULLET.life,
        })
      }

      const damage = (t: { i: number; cx: number; cy: number }, amount: number, boomX: number, boomY: number) => {
        if (hp[t.i] <= 0) return
        hp[t.i] -= amount
        booms.push({ x: boomX, y: boomY, t: 0, big: false })
        if (hp[t.i] <= 0) {
          booms.push({ x: t.cx, y: t.cy, t: 0, big: true })
          onKill(t.i)
        }
      }

      // --- update bullets + bullet/planet collisions ---
      for (let b = bullets.length - 1; b >= 0; b--) {
        const bull = bullets[b]
        bull.x += bull.vx * dt
        bull.y += bull.vy * dt
        bull.life -= dt
        let hit = false
        for (const t of targets) {
          if (!t) continue
          if (Math.hypot(bull.x - t.cx, bull.y - t.cy) < t.rad) {
            damage(t, 1, bull.x, bull.y)
            hit = true
            break
          }
        }
        if (hit || bull.life <= 0 || bull.x < -20 || bull.x > W + 20 || bull.y < -20 || bull.y > H + 20) {
          bullets.splice(b, 1)
        }
      }

      // --- ramming damage ---
      if (!won) {
        for (const t of targets) {
          if (!t) continue
          if (Math.hypot(ship.x - t.cx, ship.y - t.cy) < t.rad + 6) {
            damage(t, RAM_DPS * dt, ship.x, ship.y)
          }
        }
      }

      // --- win check ---
      if (!won && hp.every((h) => h <= 0)) {
        wonAt = now
        window.setTimeout(finish, WIN_HOLD_MS)
      }

      // --- render ---
      ctx.clearRect(0, 0, W, H)

      // target reticles + hp arcs around alive planets
      for (const t of targets) {
        if (!t) continue
        const pulse = 0.5 + 0.5 * Math.sin(now / 260)
        ctx.strokeStyle = `rgba(${ACCENT}, ${0.35 + 0.3 * pulse})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(t.cx, t.cy, t.rad + 6, 0, Math.PI * 2)
        ctx.stroke()
        // remaining-hp arc
        ctx.strokeStyle = `rgba(${ACCENT}, 0.9)`
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(t.cx, t.cy, t.rad + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * hp[t.i]) / PLANET_HP)
        ctx.stroke()
      }

      // bullets
      ctx.fillStyle = `rgba(190, 225, 255, 0.95)`
      ctx.shadowColor = `rgba(${ACCENT}, 0.9)`
      ctx.shadowBlur = 8
      for (const bull of bullets) {
        ctx.beginPath()
        ctx.arc(bull.x, bull.y, BULLET.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      // explosions (expanding fading rings)
      for (let e = booms.length - 1; e >= 0; e--) {
        const boom = booms[e]
        boom.t += dt * (boom.big ? 1.6 : 3)
        if (boom.t >= 1) {
          booms.splice(e, 1)
          continue
        }
        const max = boom.big ? 70 : 22
        ctx.strokeStyle = `rgba(${ACCENT}, ${(1 - boom.t) * 0.9})`
        ctx.lineWidth = boom.big ? 3 : 2
        ctx.beginPath()
        ctx.arc(boom.x, boom.y, max * boom.t, 0, Math.PI * 2)
        ctx.stroke()
      }

      // ship (a little saucer pointing along its heading)
      if (!won) drawShip(ctx, ship.x, ship.y, ship.angle, now)

      // win banner
      if (won) {
        const a = Math.min((now - wonAt) / 400, 1)
        ctx.globalAlpha = a
        ctx.fillStyle = '#eaf3ff'
        ctx.font = '600 28px Geist, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('PLANETS CLEARED', W / 2, H / 2)
        ctx.globalAlpha = 1
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', resize)
      window.clearTimeout(hintTimer)
      if (lenis) lenis.start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* dim backdrop (below the raised planets) - also blocks page clicks during play */}
      <div className="fixed inset-0 z-[60] bg-bg/75 backdrop-blur-sm" />
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[62]" />
      {showHint && (
        <div className="pointer-events-none fixed inset-x-0 top-[12%] z-[62] text-center">
          <p className="font-mono text-label uppercase tracking-wider text-text-mute">
            Mouse or arrow keys to fly · clear the planets · esc to exit
          </p>
        </div>
      )}
    </>
  )
}

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, now: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  // thruster flame (behind, flickering)
  const flame = 9 + Math.sin(now / 40) * 4
  ctx.fillStyle = `rgba(${ACCENT}, 0.8)`
  ctx.beginPath()
  ctx.moveTo(-11, -3)
  ctx.lineTo(-11 - flame, 0)
  ctx.lineTo(-11, 3)
  ctx.closePath()
  ctx.fill()
  // body
  ctx.shadowColor = `rgba(${ACCENT}, 0.6)`
  ctx.shadowBlur = 10
  ctx.fillStyle = '#6b7886'
  ctx.beginPath()
  ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  // canopy
  ctx.fillStyle = `rgba(150, 200, 235, 0.85)`
  ctx.beginPath()
  ctx.ellipse(1, -2, 6, 3.5, 0, Math.PI, 0)
  ctx.fill()
  // nose light
  ctx.fillStyle = '#d4ecff'
  ctx.beginPath()
  ctx.arc(10, 0, 1.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
