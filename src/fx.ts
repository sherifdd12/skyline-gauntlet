// Visual layer: a neon night city, drone targets, bursts, screen shake and a reticle.
// Pure drawing: nothing here touches game logic or the seeded course, so runs stay comparable.

/** Own tiny RNG so the city looks the same every time without consuming the course seed. */
function rng(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Layer = {cv: HTMLCanvasElement; speed: number}
let layers: Layer[] = []
let builtFor = ''
let stars: {x: number; y: number; z: number; p: number}[] = []

const NEON = ['#ff3d9a', '#39e6ff', '#b46bff', '#ffd23d']

function buildLayer(w: number, h: number, seed: number, o: {minH: number; maxH: number; body: string; win: number; neon: boolean}): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const g = cv.getContext('2d') as CanvasRenderingContext2D
  const r = rng(seed)
  let x = 0
  while (x < w) {
    const bw = Math.min(w - x, Math.round(w * (0.04 + r() * 0.07)))
    const bh = Math.round(h * (o.minH + r() * (o.maxH - o.minH)))
    const top = h - bh
    g.fillStyle = o.body
    g.fillRect(x, top, bw, bh)
    // roof details
    const roof = r()
    if (roof < 0.25) g.fillRect(x + bw * 0.2, top - bh * 0.06, bw * 0.6, bh * 0.06)
    else if (roof < 0.4) {
      g.fillRect(x + bw / 2 - 1.5, top - h * 0.05, 3, h * 0.05)
      g.fillStyle = '#ff4060'
      g.fillRect(x + bw / 2 - 2.5, top - h * 0.05 - 4, 5, 5)
    }
    // windows
    const cw = Math.max(6, Math.round(bw / 7))
    for (let wy = top + 10; wy < h - 8; wy += cw * 1.6) {
      for (let wx = x + 5; wx < x + bw - 8; wx += cw) {
        if (r() < o.win) {
          g.fillStyle = r() < 0.8 ? `rgba(255,${190 + Math.round(r() * 40)},${90 + Math.round(r() * 60)},${0.45 + r() * 0.5})` : 'rgba(120,230,255,0.7)'
          g.fillRect(wx, wy, cw * 0.45, cw * 0.7)
        }
      }
    }
    // neon edge strips and rooftop signs on the near layer
    if (o.neon && r() < 0.35) {
      const c = NEON[Math.floor(r() * NEON.length)] as string
      g.save()
      g.shadowColor = c
      g.shadowBlur = 18
      g.strokeStyle = c
      g.lineWidth = 3
      if (r() < 0.5) {
        g.beginPath()
        g.moveTo(x + 2, top + 6)
        g.lineTo(x + 2, h)
        g.stroke()
      } else {
        const sw = bw * 0.7
        g.strokeRect(x + (bw - sw) / 2, top - 26, sw, 18)
      }
      g.restore()
    }
    x += bw + Math.round(r() * 4)
  }
  return cv
}

function ensureCity(W: number, H: number): void {
  const key = `${W}x${H}`
  if (key === builtFor) return
  builtFor = key
  const portrait = H > W
  const s = portrait ? 0.55 : 0.62
  layers = [
    {cv: buildLayer(W, Math.round(H * s), 11, {minH: 0.35, maxH: 0.75, body: '#140f33', win: 0.12, neon: false}), speed: 6},
    {cv: buildLayer(W, Math.round(H * s), 23, {minH: 0.2, maxH: 0.6, body: '#0d0a24', win: 0.18, neon: true}), speed: 14},
    {cv: buildLayer(W, Math.round(H * s), 37, {minH: 0.08, maxH: 0.3, body: '#06050f', win: 0.22, neon: true}), speed: 26},
  ]
  const r = rng(5)
  stars = Array.from({length: 120}, () => ({x: r(), y: r() * 0.6, z: 0.3 + r() * 0.7, p: r() * 6.28}))
}

/** Full background: sky, moon, stars, searchlights, three parallax city layers, horizon haze. */
export function drawCity(g: CanvasRenderingContext2D, W: number, H: number, t: number, dim = 0): void {
  ensureCity(W, H)
  const sky = g.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#05061a')
  sky.addColorStop(0.45, '#160f3d')
  sky.addColorStop(0.75, '#3a1655')
  sky.addColorStop(1, '#5a1d5e')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  for (const s of stars) {
    g.globalAlpha = (0.35 + 0.45 * s.z) * (0.7 + 0.3 * Math.sin(t * 2 + s.p))
    g.fillStyle = '#cfe3ff'
    g.fillRect(s.x * W, s.y * H, 1.5 * s.z + 0.6, 1.5 * s.z + 0.6)
  }
  g.globalAlpha = 1
  // moon
  const mx = W * 0.82
  const my = H * 0.15
  const mr = Math.min(W, H) * 0.05
  const halo = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4)
  halo.addColorStop(0, 'rgba(255,220,200,0.25)')
  halo.addColorStop(1, 'rgba(255,220,200,0)')
  g.fillStyle = halo
  g.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8)
  g.fillStyle = '#ffe9d6'
  g.beginPath()
  g.arc(mx, my, mr, 0, Math.PI * 2)
  g.fill()
  // searchlights
  g.save()
  g.globalCompositeOperation = 'lighter'
  for (const [bx, sp, ph] of [
    [0.22, 0.35, 0],
    [0.68, 0.27, 2],
  ] as const) {
    const a = -Math.PI / 2 + Math.sin(t * sp + ph) * 0.5
    const len = H * 1.1
    const x0 = W * bx
    const y0 = H
    const spread = 0.06
    const beam = g.createLinearGradient(x0, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len)
    beam.addColorStop(0, 'rgba(160,140,255,0.16)')
    beam.addColorStop(1, 'rgba(160,140,255,0)')
    g.fillStyle = beam
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x0 + Math.cos(a - spread) * len, y0 + Math.sin(a - spread) * len)
    g.lineTo(x0 + Math.cos(a + spread) * len, y0 + Math.sin(a + spread) * len)
    g.closePath()
    g.fill()
  }
  g.restore()
  // parallax layers (seamless wrap)
  for (const l of layers) {
    const off = (t * l.speed) % W
    const y = H - l.cv.height
    g.drawImage(l.cv, -off, y)
    g.drawImage(l.cv, W - off, y)
  }
  // horizon haze
  const haze = g.createLinearGradient(0, H * 0.55, 0, H)
  haze.addColorStop(0, 'rgba(255,61,154,0)')
  haze.addColorStop(1, 'rgba(255,61,154,0.12)')
  g.fillStyle = haze
  g.fillRect(0, H * 0.55, W, H * 0.45)
  if (dim > 0) {
    g.fillStyle = `rgba(3,4,16,${dim})`
    g.fillRect(0, 0, W, H)
  }
}

/** A quad drone. Hit area stays a circle of radius r; the art fits inside about 1.1 r. */
export function drawDrone(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, ring: number, t: number, kind: 'enemy' | 'ally' | 'track' = 'enemy'): void {
  g.save()
  g.translate(x, y)
  g.rotate(Math.sin(t * 3 + x) * 0.08)
  const glow = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.7)
  glow.addColorStop(0, `${color}55`)
  glow.addColorStop(1, `${color}00`)
  g.fillStyle = glow
  g.beginPath()
  g.arc(0, 0, r * 1.7, 0, Math.PI * 2)
  g.fill()
  // arms + rotors
  // faint hit-area ring so the real target size is clear
  g.strokeStyle = `${color}59`
  g.lineWidth = 2
  g.beginPath()
  g.arc(0, 0, r, 0, Math.PI * 2)
  g.stroke()
  const arm = r * 0.78
  g.strokeStyle = '#c9d3ea'
  g.lineWidth = Math.max(3, r * 0.12)
  g.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2
    const ax = Math.cos(a) * arm
    const ay = Math.sin(a) * arm
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(ax, ay)
    g.stroke()
    g.save()
    g.translate(ax, ay)
    g.rotate(t * 40 + i)
    g.fillStyle = 'rgba(230,240,255,0.28)'
    g.beginPath()
    g.ellipse(0, 0, r * 0.3, r * 0.09, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
    g.fillStyle = color
    g.beginPath()
    g.arc(ax, ay, r * 0.08, 0, Math.PI * 2)
    g.fill()
  }
  // body
  g.shadowColor = color
  g.shadowBlur = 22
  g.fillStyle = '#0c1226'
  g.strokeStyle = color
  g.lineWidth = Math.max(3, r * 0.1)
  g.beginPath()
  g.arc(0, 0, r * 0.58, 0, Math.PI * 2)
  g.fill()
  g.stroke()
  g.shadowBlur = 0
  if (kind === 'ally') {
    g.strokeStyle = '#e6f0ff'
    g.lineWidth = Math.max(3, r * 0.1)
    g.beginPath()
    g.moveTo(-r * 0.22, 0)
    g.lineTo(-r * 0.05, r * 0.17)
    g.lineTo(r * 0.25, -r * 0.17)
    g.stroke()
  } else {
    // eye
    const pulse = 0.85 + 0.15 * Math.sin(t * 8)
    g.fillStyle = color
    g.beginPath()
    g.arc(0, 0, r * 0.27 * pulse, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#fff'
    g.beginPath()
    g.arc(-r * 0.06, -r * 0.06, r * 0.07, 0, Math.PI * 2)
    g.fill()
  }
  if (kind === 'track') {
    // rotating lock-on brackets
    g.rotate(t * 1.5)
    g.strokeStyle = color
    g.lineWidth = 3
    for (let i = 0; i < 4; i++) {
      g.beginPath()
      g.arc(0, 0, r + 10, i * (Math.PI / 2), i * (Math.PI / 2) + 0.6)
      g.stroke()
    }
  }
  if (ring < 1) {
    g.strokeStyle = ring > 0.7 ? '#ff5a5a' : '#ffffffaa'
    g.lineWidth = 4
    g.beginPath()
    g.arc(0, 0, r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - ring))
    g.stroke()
  }
  g.restore()
}

// ---------- particles, shake, flash ----------
type Part = {x: number; y: number; vx: number; vy: number; age: number; life: number; c: string; s: number}
type Ring = {x: number; y: number; age: number; c: string; r: number}
let parts: Part[] = []
let rings: Ring[] = []
let shake = 0
let flash = 0

export function burst(x: number, y: number, color: string, big = false): void {
  const n = big ? 34 : 22
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const sp = 200 + Math.random() * (big ? 620 : 420)
    parts.push({x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: 0.35 + Math.random() * 0.35, c: Math.random() < 0.3 ? '#ffffff' : color, s: 2 + Math.random() * 4})
  }
  rings.push({x, y, age: 0, c: color, r: big ? 140 : 100})
  shake = Math.min(14, shake + (big ? 9 : 5))
}

export function hurt(x: number, y: number): void {
  rings.push({x, y, age: 0, c: '#ff4060', r: 70})
  shake = Math.min(18, shake + 10)
  flash = 0.35
}

export function stepFx(dt: number): void {
  for (const p of parts) {
    p.age += dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= 0.92
    p.vy = p.vy * 0.92 + 500 * dt
  }
  parts = parts.filter(p => p.age < p.life)
  for (const r of rings) r.age += dt
  rings = rings.filter(r => r.age < 0.4)
  shake = Math.max(0, shake - dt * 60)
  flash = Math.max(0, flash - dt * 1.6)
}

export function shakeOffset(): {x: number; y: number} {
  return {x: (Math.random() - 0.5) * shake, y: (Math.random() - 0.5) * shake}
}

export function drawFx(g: CanvasRenderingContext2D): void {
  g.save()
  g.globalCompositeOperation = 'lighter'
  for (const r of rings) {
    const k = r.age / 0.4
    g.globalAlpha = 1 - k
    g.strokeStyle = r.c
    g.lineWidth = 6 * (1 - k) + 1
    g.beginPath()
    g.arc(r.x, r.y, 20 + r.r * k, 0, Math.PI * 2)
    g.stroke()
  }
  for (const p of parts) {
    g.globalAlpha = 1 - p.age / p.life
    g.fillStyle = p.c
    g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s)
  }
  g.restore()
}

export function drawFlash(g: CanvasRenderingContext2D, W: number, H: number): void {
  if (flash <= 0) return
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75)
  v.addColorStop(0, 'rgba(255,40,70,0)')
  v.addColorStop(1, `rgba(255,40,70,${flash})`)
  g.fillStyle = v
  g.fillRect(0, 0, W, H)
}

export function drawReticle(g: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  g.save()
  g.translate(x, y)
  g.shadowColor = '#39e6ff'
  g.shadowBlur = 10
  g.strokeStyle = '#bff6ff'
  g.lineWidth = 2.5
  g.beginPath()
  g.arc(0, 0, 16, 0, Math.PI * 2)
  g.stroke()
  for (let i = 0; i < 4; i++) {
    g.rotate(Math.PI / 2)
    g.beginPath()
    g.moveTo(9, 0)
    g.lineTo(24, 0)
    g.stroke()
  }
  g.rotate(t * 2)
  g.strokeStyle = '#ff3d9a'
  g.beginPath()
  g.arc(0, 0, 22, 0, 0.8)
  g.stroke()
  g.fillStyle = '#fff'
  g.fillRect(-1.5, -1.5, 3, 3)
  g.restore()
}
