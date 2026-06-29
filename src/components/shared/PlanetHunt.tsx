import { useEffect, useRef, useState } from 'react'
import { lenis } from '../../lib/lenis'

/*
  Easter-egg mini-game (triggered from Planets.tsx when all three background planets are lit at once).
  You fly a little saucer - the same craft as the drifting Spaceship fly-by - and it auto-fires in its
  heading; sweep across the planets (or ram them) to blow all three up. The planets shoot back: three
  hits and your ship is destroyed. Clear them to win, lose all lives to lose, exit any time.

  Controls adapt to the device:
    - desktop: MOUSE (the ship trails the cursor) or ARROW KEYS / WASD; Esc exits.
    - touch (tablet/phone): a floating VIRTUAL JOYSTICK - touch anywhere and drag to steer; an exit
      button (top-right) closes it.

  Graphics (saucer, bullets, debris, explosions, reticles, stars, joystick) are drawn on a transparent
  full-screen <canvas> so the per-frame motion never re-renders React. The planets stay their real DOM
  elements (Planets raises them above the dim backdrop during play); we read their live rects each frame
  for aiming + collisions and call onKill(i) to pop each one. Scroll is locked (lenis.stop) for the run.
*/

const SHIP = { cursorLerp: 0.14, accel: 0.85, friction: 0.9, maxSpeed: 13, nose: 16, hitRadius: 12 }
const BULLET = { speed: 640, radius: 3, cadenceMs: 110, life: 1.1 }
const ENEMY = { speed: 245, radius: 4, intervalMs: 1700, life: 5 }
const PLANET_HP = 6
const RAM_DPS = 9 // hp/sec drained while the ship overlaps a planet
const LIVES = 3
const INVULN_MS = 1300 // grace (with a blink) after taking a hit
const GRACE_MS = 900 // before the planets open fire
const OVER_HOLD_MS = 2400
const ACCENT = '120, 200, 245'
const HOSTILE = '255, 120, 90'
const JOY_RADIUS = 58 // virtual-joystick reach (touch): full speed at this drag distance
// Asteroids: solid obstacles you weave around. They block your shots and your ship, but the planets'
// bolts pass straight through them (so they're never cover - only a hindrance).
const ASTEROID_SPOTS = [
  [0.3, 0.4],
  [0.66, 0.34],
  [0.5, 0.62],
  [0.8, 0.56],
]

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
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; warm: boolean }
type Asteroid = { x: number; y: number; vx: number; vy: number; r: number; angle: number; spin: number; verts: number[] }

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
  const finishRef = useRef<() => void>(() => {})
  // Coarse pointer = touch device -> joystick controls + touch hint copy.
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

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
    const joy = { active: false, id: -1, baseX: 0, baseY: 0, curX: 0, curY: 0 }
    const bullets: Bullet[] = []
    const enemies: Bullet[] = []
    const booms: Boom[] = []
    const particles: Particle[] = []
    let shake = 0
    const asteroids: Asteroid[] = ASTEROID_SPOTS.map(([fx, fy]) => {
      const dir = Math.random() * Math.PI * 2
      const speed = 26 + Math.random() * 22
      return {
        x: fx * window.innerWidth,
        y: fy * window.innerHeight,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        r: 17 + Math.random() * 12,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() * 2 - 1) * 0.5,
        verts: Array.from({ length: 9 }, () => 0.7 + Math.random() * 0.45),
      }
    })
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
    finishRef.current = finish

    // A burst of flying debris - the juice on every hit/kill/ship-loss.
    const spawnDebris = (x: number, y: number, n: number, warm: boolean) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 50 + Math.random() * 230
        const life = 0.4 + Math.random() * 0.55
        particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life, size: 1 + Math.random() * 2.4, warm })
      }
    }

    // --- input: mouse trails the cursor; touch drives the joystick; keys steer directly ---
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        if (joy.active && event.pointerId === joy.id) {
          joy.curX = event.clientX
          joy.curY = event.clientY
        }
        return
      }
      mouse.x = event.clientX
      mouse.y = event.clientY
      mouse.active = true
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return
      // ignore taps on the on-screen UI (the exit button)
      const target = event.target
      if (target instanceof Element && target.closest('[data-game-ui]')) return
      joy.active = true
      joy.id = event.pointerId
      joy.baseX = joy.curX = event.clientX
      joy.baseY = joy.curY = event.clientY
      mouse.active = false
    }
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && event.pointerId === joy.id) joy.active = false
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
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('resize', resize)
    if (lenis) lenis.stop()
    const hintTimer = window.setTimeout(() => setShowHint(false), 4200)

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const W = window.innerWidth
      const H = window.innerHeight
      const elapsed = now - t0
      const over = wonAt > 0 || lostAt > 0
      shake *= Math.pow(0.0025, dt) // smooth exponential decay of screen shake

      // --- asteroids drift + bounce off the edges ---
      for (const a of asteroids) {
        a.x += a.vx * dt
        a.y += a.vy * dt
        a.angle += a.spin * dt
        if (a.x < a.r) { a.x = a.r; a.vx = Math.abs(a.vx) }
        else if (a.x > W - a.r) { a.x = W - a.r; a.vx = -Math.abs(a.vx) }
        if (a.y < a.r) { a.y = a.r; a.vy = Math.abs(a.vy) }
        else if (a.y > H - a.r) { a.y = H - a.r; a.vy = -Math.abs(a.vy) }
      }

      // --- movement ---
      if (!over) {
        if (joy.active) {
          const dx = joy.curX - joy.baseX
          const dy = joy.curY - joy.baseY
          const dist = Math.hypot(dx, dy)
          if (dist > 4) {
            const mag = Math.min(dist, JOY_RADIUS) / JOY_RADIUS
            const tvx = (dx / dist) * mag * SHIP.maxSpeed
            const tvy = (dy / dist) * mag * SHIP.maxSpeed
            ship.vx += (tvx - ship.vx) * 0.3
            ship.vy += (tvy - ship.vy) * 0.3
          } else {
            ship.vx *= 0.8
            ship.vy *= 0.8
          }
        } else if (mouse.active) {
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
        // can't fly through asteroids - get pushed to their edge, so you weave around them
        for (const a of asteroids) {
          const dx = ship.x - a.x
          const dy = ship.y - a.y
          const d = Math.hypot(dx, dy)
          const min = a.r + SHIP.hitRadius
          if (d > 0.001 && d < min) {
            ship.x = a.x + (dx / d) * min
            ship.y = a.y + (dy / d) * min
          }
        }
      }
      const shipSpeed = Math.hypot(ship.vx, ship.vy)

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
        spawnDebris(bx, by, 4, false)
        if (hp[t.i] <= 0) {
          booms.push({ x: t.cx, y: t.cy, t: 0, big: true })
          spawnDebris(t.cx, t.cy, 22, false)
          shake = Math.min(shake + 10, 16)
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
        // YOUR bolts are stopped by asteroids (the planets' bolts pass through, handled below)
        if (!hit) {
          for (const a of asteroids) {
            if (Math.hypot(bull.x - a.x, bull.y - a.y) < a.r) {
              booms.push({ x: bull.x, y: bull.y, t: 0, big: false })
              spawnDebris(bull.x, bull.y, 3, false)
              hit = true
              break
            }
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
          spawnDebris(ship.x, ship.y, 10, true)
          shake = Math.min(shake + 8, 16)
          gone = true
          if (lives <= 0) {
            lostAt = now
            booms.push({ x: ship.x, y: ship.y, t: 0, big: true, hostile: true })
            spawnDebris(ship.x, ship.y, 28, true)
            shake = 18
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

      // --- particles ---
      for (let p = particles.length - 1; p >= 0; p--) {
        const part = particles[p]
        part.x += part.vx * dt
        part.y += part.vy * dt
        part.vx *= Math.pow(0.12, dt)
        part.vy *= Math.pow(0.12, dt)
        part.life -= dt
        if (part.life <= 0) particles.splice(p, 1)
      }

      // ============ render ============
      ctx.clearRect(0, 0, W, H)
      // screen shake: jitter the whole gameplay layer (the HUD + joystick draw after, steady)
      const sx = shake > 0.3 ? (Math.random() * 2 - 1) * shake : 0
      const sy = shake > 0.3 ? (Math.random() * 2 - 1) * shake : 0
      ctx.save()
      ctx.translate(sx, sy)

      // stars
      for (const s of STARS) {
        const a = s.tw ? s.a * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin((now / 1000) * s.sp + s.ph))) : s.a
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // asteroids
      for (const a of asteroids) drawAsteroid(ctx, a)

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

      // debris particles (drawn under the bolts; glow via shadow)
      for (const part of particles) {
        const a = part.life / part.max
        ctx.fillStyle = `rgba(${part.warm ? '255, 190, 150' : '200, 230, 255'}, ${a * 0.9})`
        ctx.beginPath()
        ctx.arc(part.x, part.y, part.size * (0.4 + a * 0.6), 0, Math.PI * 2)
        ctx.fill()
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

      // explosions (shockwave rings, with a bright flash for the big ones)
      for (let e = booms.length - 1; e >= 0; e--) {
        const boom = booms[e]
        boom.t += dt * (boom.big ? 1.6 : 3)
        if (boom.t >= 1) {
          booms.splice(e, 1)
          continue
        }
        const max = boom.big ? 70 : 22
        const col = boom.hostile ? HOSTILE : ACCENT
        if (boom.big) {
          ctx.fillStyle = `rgba(${col}, ${(1 - boom.t) * 0.4})`
          ctx.beginPath()
          ctx.arc(boom.x, boom.y, max * boom.t * 0.7, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.strokeStyle = `rgba(${col}, ${(1 - boom.t) * 0.9})`
        ctx.lineWidth = boom.big ? 3 : 2
        ctx.beginPath()
        ctx.arc(boom.x, boom.y, max * boom.t, 0, Math.PI * 2)
        ctx.stroke()
      }

      // ship (destroyed once lost) - blinks briefly after a hit; engine glow swells when moving
      if (lostAt === 0) {
        const blink = now < invulnUntil && Math.floor(now / 90) % 2 === 0
        ctx.save()
        ctx.globalAlpha = blink ? 0.35 : 1
        ctx.translate(ship.x, ship.y + Math.sin(now / 400) * 1.5)
        const flip = ship.vx < -0.4 ? -1 : 1
        ctx.scale(flip * 0.82, 0.82)
        drawSaucer(ctx, shipSpeed / SHIP.maxSpeed)
        ctx.restore()
      }

      ctx.restore() // end shake

      // ---- HUD (steady, no shake) ----
      // lives (mini saucers, top-left)
      for (let i = 0; i < LIVES; i++) {
        ctx.save()
        ctx.globalAlpha = i < lives ? 1 : 0.22
        ctx.translate(28 + i * 30, 30)
        ctx.scale(0.5, 0.5)
        drawSaucer(ctx, 0)
        ctx.restore()
      }

      // virtual joystick (touch): faint base ring + thumb at the drag offset
      if (joy.active && !over) {
        const dx = joy.curX - joy.baseX
        const dy = joy.curY - joy.baseY
        const dist = Math.hypot(dx, dy)
        const k = dist > JOY_RADIUS ? JOY_RADIUS / dist : 1
        ctx.strokeStyle = `rgba(${ACCENT}, 0.25)`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(joy.baseX, joy.baseY, JOY_RADIUS, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = `rgba(${ACCENT}, 0.35)`
        ctx.beginPath()
        ctx.arc(joy.baseX + dx * k, joy.baseY + dy * k, 20, 0, Math.PI * 2)
        ctx.fill()
      }

      // banner (win / lose) on a soft panel, fading in
      if (over) {
        const won = wonAt > 0
        const at = wonAt || lostAt
        const fade = Math.min((now - at) / 400, 1)
        ctx.globalAlpha = fade
        ctx.fillStyle = 'rgba(6, 10, 15, 0.7)'
        roundRect(ctx, W / 2 - 170, H / 2 - 38, 340, 76, 14)
        ctx.fill()
        ctx.fillStyle = won ? '#eaf3ff' : `rgb(${HOSTILE})`
        ctx.font = '600 28px Geist, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(won ? 'PLANETS CLEARED' : 'SHIP DESTROYED', W / 2, H / 2 + 9)
        ctx.globalAlpha = 1
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
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

      {/* Exit button - the only way out on touch (no Esc); a quiet × top-right. */}
      <button
        type="button"
        data-game-ui
        onClick={() => finishRef.current()}
        aria-label="Exit game"
        className="fixed right-4 top-4 z-[63] flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2/80 text-text-mute backdrop-blur transition-colors hover:text-accent-hi"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {showHint && (
        <div className="pointer-events-none fixed inset-x-0 top-[12%] z-[62] px-6 text-center">
          <p className="font-mono text-label uppercase tracking-wider text-text-mute">
            {isTouch
              ? 'Drag to fly · clear the planets · dodge their fire'
              : 'Mouse or arrow keys to fly · clear the planets · dodge their fire · esc to exit'}
          </p>
        </div>
      )}
    </>
  )
}

// Rounded-rectangle path helper for the game-over panel.
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// The same craft as the Spaceship fly-by, drawn centred at the origin (canvas units ~ its 44x24 art,
// body centre at 0,0). Caller applies position / scale / flip / alpha. `thrust` (0..1) swells the
// underside engine glow as the ship moves.
function drawSaucer(ctx: CanvasRenderingContext2D, thrust = 0) {
  const ell = (cx: number, cy: number, rx: number, ry: number) => {
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  if (thrust > 0.05) {
    ctx.shadowColor = `rgba(${ACCENT}, ${0.5 + 0.4 * thrust})`
    ctx.shadowBlur = 8 + 14 * thrust
    ctx.fillStyle = `rgba(150, 210, 245, ${0.25 + 0.3 * thrust})`
    ell(0, 6, 8 + 6 * thrust, 2.5 + 2 * thrust) // engine glow under the hull
    ctx.shadowBlur = 0
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

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid) {
  ctx.save()
  ctx.translate(a.x, a.y)
  ctx.rotate(a.angle)
  ctx.beginPath()
  const n = a.verts.length
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2
    const rr = a.r * a.verts[i]
    const px = Math.cos(ang) * rr
    const py = Math.sin(ang) * rr
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = '#4b5059'
  ctx.fill()
  ctx.strokeStyle = 'rgba(185, 200, 220, 0.35)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // a couple of craters for texture
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.beginPath()
  ctx.arc(-a.r * 0.22, -a.r * 0.12, a.r * 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(a.r * 0.28, a.r * 0.18, a.r * 0.13, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
