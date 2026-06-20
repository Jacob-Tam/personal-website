import { useEffect, useRef, useState } from 'react'
import { lenis } from '../../lib/lenis'

/*
  Easter-egg mini-game (triggered from Planets.tsx when all three background planets are lit at once).
  You fly a little saucer - the same craft as the drifting Spaceship fly-by - with the MOUSE or the
  ARROW KEYS (WASD too). It auto-fires in its heading; sweep across the planets (or ram them) to blow
  all three up. But the planets shoot back: take three hits and your ship is destroyed. Clear them to
  win, lose all lives to lose, Esc to bail.

  Graphics (saucer, bullets, explosions, reticles, stars) are drawn on a transparent full-screen
  <canvas> so the per-frame motion never re-renders React. The planets stay their real DOM elements
  (Planets raises them above the dim backdrop during play); we read their live rects each frame for
  aiming + collisions, and call onKill(i) to pop each one. Scroll is locked (lenis.stop) for the run.
*/

const SHIP = { cursorLerp: 0.14, accel: 0.85, friction: 0.9, maxSpeed: 13, nose: 16, hitRadius: 12 }
const BULLET = { speed: 640, radius: 3, cadenceMs: 110, life: 1.1 }
const ENEMY = { speed: 245, radius: 4, intervalMs: 1700, life: 5 }
const PLANET_HP = 6
const RAM_DPS = 9 // hp/sec drained while the ship overlaps a planet
const LIVES = 3
const INVULN_MS = 1300 // grace (with a blink) after taking a hit
const GRACE_MS = 900 // before the planets open fire
const OVER_HOLD_MS = 2200
const ACCENT = '120, 200, 245'
const HOSTILE = '255, 120, 90'

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Seeded backdrop starfield (fractions of the viewport; some twinkle). Stable across runs.
const STARS = (() => {
  const rand = mulberry32(1337)
  return Array.from({ length: 120 }, () => ({
    x: rand(),
    y: rand(),
    r: rand() > 0.86 ? 1.6 : rand() > 0.6 ? 1.1 : 0.7,
    a: 0.22 + rand() * 0.5,
    tw: rand() > 0.5,
    sp: 0.6 + rand() * 1.6,
    ph: rand() * Math.PI * 2,
  }))
})()

type Bullet = { x: number; y: number; vx: number; vy: number; life: number }
type Boom = { x: number; y: number; t: number; big: boolean; hostile?: boolean }

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
    const enemies: Bullet[] = []
    const booms: Boom[] = []
    const hp = planetEls.map(() => PLANET_HP)
    const nextEnemyFire = planetEls.map((_, i) => GRACE_MS + i * 450) // staggered first shots (ms elapsed)
    let lives = LIVES
    let invulnUntil = 0
    let lastFire = 0
    let wonAt = 0
    let lostAt = 0
    let ended = false
    let raf = 0
    const t0 = performance.now()

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
    const hintTimer = window.setTimeout(() => setShowHint(false), 3800)

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const W = window.innerWidth
      const H = window.innerHeight
      const elapsed = now - t0
      const over = wonAt > 0 || lostAt > 0

      // --- movement ---
      if (!over) {
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

      const damage = (t: { i: number; cx: number; cy: number }, amount: number, bx: number, by: number) => {
        if (hp[t.i] <= 0) return
        hp[t.i] -= amount
        booms.push({ x: bx, y: by, t: 0, big: false })
        if (hp[t.i] <= 0) {
          booms.push({ x: t.cx, y: t.cy, t: 0, big: true })
          onKill(t.i)
        }
      }

      // --- player fire ---
      if (!over && now - lastFire > BULLET.cadenceMs) {
        lastFire = now
        bullets.push({
          x: ship.x + Math.cos(ship.angle) * SHIP.nose,
          y: ship.y + Math.sin(ship.angle) * SHIP.nose,
          vx: Math.cos(ship.angle) * BULLET.speed,
          vy: Math.sin(ship.angle) * BULLET.speed,
          life: BULLET.life,
        })
      }

      // --- player bullets + collisions ---
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

      // --- ramming ---
      if (!over) {
        for (const t of targets) {
          if (!t) continue
          if (Math.hypot(ship.x - t.cx, ship.y - t.cy) < t.rad + 6) damage(t, RAM_DPS * dt, ship.x, ship.y)
        }
      }

      // --- planets return fire ---
      if (!over) {
        for (const t of targets) {
          if (!t || elapsed < nextEnemyFire[t.i]) continue
          nextEnemyFire[t.i] = elapsed + ENEMY.intervalMs + Math.random() * 700
          const dx = ship.x - t.cx
          const dy = ship.y - t.cy
          const d = Math.hypot(dx, dy) || 1
          enemies.push({ x: t.cx, y: t.cy, vx: (dx / d) * ENEMY.speed, vy: (dy / d) * ENEMY.speed, life: ENEMY.life })
        }
      }

      // --- enemy bullets + ship hits ---
      for (let e = enemies.length - 1; e >= 0; e--) {
        const en = enemies[e]
        en.x += en.vx * dt
        en.y += en.vy * dt
        en.life -= dt
        let gone = en.life <= 0 || en.x < -20 || en.x > W + 20 || en.y < -20 || en.y > H + 20
        if (!over && now > invulnUntil && Math.hypot(en.x - ship.x, en.y - ship.y) < SHIP.hitRadius + ENEMY.radius) {
          lives -= 1
          invulnUntil = now + INVULN_MS
          booms.push({ x: ship.x, y: ship.y, t: 0, big: false, hostile: true })
          gone = true
          if (lives <= 0) {
            lostAt = now
            booms.push({ x: ship.x, y: ship.y, t: 0, big: true, hostile: true })
            window.setTimeout(finish, OVER_HOLD_MS)
          }
        }
        if (gone) enemies.splice(e, 1)
      }

      // --- win check ---
      if (!over && hp.every((h) => h <= 0)) {
        wonAt = now
        window.setTimeout(finish, OVER_HOLD_MS)
      }

      // ============ render ============
      ctx.clearRect(0, 0, W, H)

      // stars
      for (const s of STARS) {
        const a = s.tw ? s.a * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now / 1000 * s.sp + s.ph))) : s.a
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // target reticles + remaining-hp arcs
      for (const t of targets) {
        if (!t) continue
        const pulse = 0.5 + 0.5 * Math.sin(now / 260)
        ctx.strokeStyle = `rgba(${ACCENT}, ${0.35 + 0.3 * pulse})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(t.cx, t.cy, t.rad + 6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = `rgba(${ACCENT}, 0.9)`
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(t.cx, t.cy, t.rad + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * hp[t.i]) / PLANET_HP)
        ctx.stroke()
      }

      // player bullets (cool)
      ctx.fillStyle = `rgba(190, 225, 255, 0.95)`
      ctx.shadowColor = `rgba(${ACCENT}, 0.9)`
      ctx.shadowBlur = 8
      for (const bull of bullets) {
        ctx.beginPath()
        ctx.arc(bull.x, bull.y, BULLET.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      // enemy bullets (hostile warm)
      ctx.fillStyle = `rgba(255, 180, 150, 0.95)`
      ctx.shadowColor = `rgba(${HOSTILE}, 0.9)`
      for (const en of enemies) {
        ctx.beginPath()
        ctx.arc(en.x, en.y, ENEMY.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      // explosions
      for (let e = booms.length - 1; e >= 0; e--) {
        const boom = booms[e]
        boom.t += dt * (boom.big ? 1.6 : 3)
        if (boom.t >= 1) {
          booms.splice(e, 1)
          continue
        }
        const max = boom.big ? 70 : 22
        ctx.strokeStyle = `rgba(${boom.hostile ? HOSTILE : ACCENT}, ${(1 - boom.t) * 0.9})`
        ctx.lineWidth = boom.big ? 3 : 2
        ctx.beginPath()
        ctx.arc(boom.x, boom.y, max * boom.t, 0, Math.PI * 2)
        ctx.stroke()
      }

      // ship (destroyed once lost) - blinks briefly after a hit
      if (lostAt === 0) {
        const blink = now < invulnUntil && Math.floor(now / 90) % 2 === 0
        ctx.save()
        ctx.globalAlpha = blink ? 0.35 : 1
        ctx.translate(ship.x, ship.y + Math.sin(now / 400) * 1.5)
        const flip = ship.vx < -0.4 ? -1 : 1
        ctx.scale(flip * 0.82, 0.82)
        drawSaucer(ctx)
        ctx.restore()
      }

      // lives (mini saucers, top-left)
      for (let i = 0; i < LIVES; i++) {
        ctx.save()
        ctx.globalAlpha = i < lives ? 1 : 0.22
        ctx.translate(28 + i * 30, 30)
        ctx.scale(0.5, 0.5)
        drawSaucer(ctx)
        ctx.restore()
      }

      // banner
      if (over) {
        const at = wonAt || lostAt
        ctx.globalAlpha = Math.min((now - at) / 400, 1)
        ctx.fillStyle = wonAt ? '#eaf3ff' : `rgb(${HOSTILE})`
        ctx.font = '600 28px Geist, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(wonAt ? 'PLANETS CLEARED' : 'SHIP DESTROYED', W / 2, H / 2)
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
      <div className="fixed inset-0 z-[60] bg-bg/80 backdrop-blur-sm" />
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[62]" />
      {showHint && (
        <div className="pointer-events-none fixed inset-x-0 top-[12%] z-[62] text-center">
          <p className="font-mono text-label uppercase tracking-wider text-text-mute">
            Mouse or arrow keys to fly · clear the planets · dodge their fire · esc to exit
          </p>
        </div>
      )}
    </>
  )
}

// The same craft as the Spaceship fly-by, drawn centred at the origin (canvas units ~ its 44x24 art,
// body centre at 0,0). Caller applies position / scale / flip / alpha.
function drawSaucer(ctx: CanvasRenderingContext2D) {
  const ell = (cx: number, cy: number, rx: number, ry: number) => {
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(96, 170, 220, 0.22)'
  ell(0, 4, 20, 3) // ground-glow shadow
  ctx.fillStyle = '#3f4a55'
  ell(0, 1, 20, 5) // underside
  ctx.shadowColor = `rgba(${ACCENT}, 0.55)`
  ctx.shadowBlur = 10
  ctx.fillStyle = '#6b7886'
  ell(0, 0, 20, 4) // hull
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(150, 200, 235, 0.55)' // dome
  ctx.beginPath()
  ctx.ellipse(0, 0, 12, 9, 0, Math.PI, 2 * Math.PI)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#d4ecff' // running lights
  for (const lx of [-8, 0, 8]) {
    ctx.beginPath()
    ctx.arc(lx, 1.6, 1.1, 0, Math.PI * 2)
    ctx.fill()
  }
}
