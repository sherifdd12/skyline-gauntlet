// The three 20-second skill rounds. Everything is in a fixed 1600x900 logical space.
import { sfx } from "./audio";

export const W = 1600;
export const H = 900;
export const ROUND_SECONDS = 20;

export interface Input {
  x: number;
  y: number;
  clicks: { x: number; y: number }[]; // clicks since last frame
}

export interface Pop {
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
}

export interface RoundStats {
  score: number;
  hits: number;
  misses: number;
  detail: string; // short human summary for the results card
}

export abstract class Round {
  t = 0;
  score = 0;
  hits = 0;
  misses = 0;
  combo = 0;
  pops: Pop[] = [];
  constructor(protected rnd: () => number) {}
  abstract readonly key: "flick" | "track" | "clutch";
  abstract readonly title: string;
  abstract readonly hint: string;
  get done() {
    return this.t >= ROUND_SECONDS;
  }
  get left() {
    return Math.max(0, ROUND_SECONDS - this.t);
  }
  /** Where an ideal player would aim right now (used by the soak-test bot). */
  abstract aimPoint(): { x: number; y: number; shoot: boolean } | null;
  abstract step(dt: number, inp: Input): void;
  abstract drawWorld(g: CanvasRenderingContext2D): void;
  abstract stats(): RoundStats;
  pop(x: number, y: number, text: string, color: string) {
    this.pops.push({ x, y, text, color, age: 0 });
  }
  update(dt: number, inp: Input) {
    this.t += dt;
    this.step(dt, inp);
    for (const p of this.pops) p.age += dt;
    this.pops = this.pops.filter((p) => p.age < 0.8);
  }
  add(points: number) {
    this.score = Math.max(0, this.score + points);
  }
}

interface Target {
  x: number;
  y: number;
  r: number;
  born: number;
  life: number;
  enemy: boolean;
}

const MARGIN = 120;
function spot(rnd: () => number, r: number) {
  return { x: MARGIN + r + rnd() * (W - 2 * MARGIN - 2 * r), y: MARGIN + 60 + r + rnd() * (H - 2 * MARGIN - 60 - 2 * r) };
}

export function drawTarget(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, ring: number) {
  g.save();
  g.translate(x, y);
  g.shadowColor = color;
  g.shadowBlur = 24;
  g.strokeStyle = color;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.stroke();
  g.shadowBlur = 0;
  g.fillStyle = color + "33";
  g.fill();
  g.fillStyle = color;
  g.beginPath();
  g.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  g.fill();
  if (ring < 1) {
    g.strokeStyle = "#ffffff88";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(0, 0, r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - ring));
    g.stroke();
  }
  g.restore();
}

/** Round 1 — Flick: click each target as fast as you can. Targets shrink as the round goes on. */
export class Flick extends Round {
  readonly key = "flick";
  readonly title = "FLICK";
  readonly hint = "Click the targets. Faster = more points.";
  target: Target;
  reactions: number[] = [];
  constructor(rnd: () => number) {
    super(rnd);
    this.target = this.spawn();
  }
  spawn(): Target {
    const r = 46 - 22 * Math.min(1, this.t / ROUND_SECONDS);
    return { ...spot(this.rnd, r), r, born: this.t, life: 99, enemy: true };
  }
  aimPoint() {
    return { x: this.target.x, y: this.target.y, shoot: true };
  }
  step(_dt: number, inp: Input) {
    for (const c of inp.clicks) {
      const tg = this.target;
      if (Math.hypot(c.x - tg.x, c.y - tg.y) <= tg.r + 4) {
        const rt = this.t - tg.born;
        this.reactions.push(rt);
        const pts = 100 + Math.round(Math.max(0, 150 * (1 - (rt - 0.3) / 1.0)));
        this.hits++;
        this.combo++;
        this.add(pts);
        this.pop(tg.x, tg.y, "+" + pts, "#7cf");
        sfx.hit(this.combo);
        this.target = this.spawn();
      } else {
        this.misses++;
        this.combo = 0;
        this.add(-25);
        this.pop(c.x, c.y, "-25", "#f66");
        sfx.miss();
      }
    }
  }
  drawWorld(g: CanvasRenderingContext2D) {
    drawTarget(g, this.target.x, this.target.y, this.target.r, "#4fc3ff", 1);
  }
  stats(): RoundStats {
    const avg = this.reactions.length ? this.reactions.reduce((a, b) => a + b, 0) / this.reactions.length : 0;
    const acc = this.hits + this.misses ? Math.round((100 * this.hits) / (this.hits + this.misses)) : 0;
    return { score: this.score, hits: this.hits, misses: this.misses, detail: `${this.hits} hits · ${Math.round(avg * 1000)} ms avg · ${acc}% accuracy` };
  }
}

/** Round 2 — Track: keep the crosshair on the moving drone. Points flow while you're on it. */
export class Track extends Round {
  readonly key = "track";
  readonly title = "TRACK";
  readonly hint = "Keep your cursor on the drone.";
  x = W / 2;
  y = H / 2;
  vx = 0;
  vy = 0;
  r = 42;
  onTime = 0;
  phase: number;
  constructor(rnd: () => number) {
    super(rnd);
    this.phase = rnd() * 10;
  }
  aimPoint() {
    return { x: this.x, y: this.y, shoot: false };
  }
  step(dt: number, inp: Input) {
    const k = 1 + this.t / ROUND_SECONDS; // speeds up
    const tt = this.t * 0.9 * k + this.phase;
    const tx = W / 2 + Math.sin(tt * 0.83) * 560 + Math.sin(tt * 2.1) * 140;
    const ty = H / 2 + 30 + Math.sin(tt * 1.17 + 1) * 270 + Math.cos(tt * 2.9) * 70;
    this.vx = (tx - this.x) / Math.max(dt, 1e-3);
    this.vy = (ty - this.y) / Math.max(dt, 1e-3);
    this.x = tx;
    this.y = ty;
    const on = Math.hypot(inp.x - this.x, inp.y - this.y) <= this.r;
    if (on) {
      this.onTime += dt;
      this.combo += dt;
      const before = Math.floor(this.score / 50);
      this.add(dt * (90 + Math.min(this.combo, 4) * 30));
      if (Math.floor(this.score / 50) > before) sfx.tick();
    } else this.combo = 0;
    this.hits = Math.round(this.onTime * 10);
  }
  drawWorld(g: CanvasRenderingContext2D) {
    const on = this.combo > 0;
    drawTarget(g, this.x, this.y, this.r, on ? "#5dffa8" : "#4fc3ff", 1);
    g.save();
    g.strokeStyle = on ? "#5dffa8" : "#4fc3ff88";
    g.lineWidth = 3;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(this.x + s * (this.r + 6), this.y);
      g.lineTo(this.x + s * (this.r + 26), this.y - 10);
      g.stroke();
    }
    g.restore();
  }
  stats(): RoundStats {
    this.score = Math.round(this.score);
    const pct = Math.round((100 * this.onTime) / ROUND_SECONDS);
    return { score: this.score, hits: this.hits, misses: 0, detail: `${pct}% time on target` };
  }
}

/** Round 3 — Clutch: shoot the orange threats, never the blue allies. Speed and judgment. */
export class Clutch extends Round {
  readonly key = "clutch";
  readonly title = "CLUTCH";
  readonly hint = "Hit ORANGE threats. Never hit BLUE allies.";
  targets: Target[] = [];
  nextSpawn = 0.3;
  allyHits = 0;
  escaped = 0;
  aimPoint() {
    const e = this.targets.filter((t) => t.enemy).sort((a, b) => a.born - b.born)[0];
    return e ? { x: e.x, y: e.y, shoot: true } : null;
  }
  step(_dt: number, inp: Input) {
    const prog = this.t / ROUND_SECONDS;
    if (this.t >= this.nextSpawn) {
      const n = this.rnd() < 0.35 + prog * 0.3 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const r = 40 - 10 * prog;
        const p = spot(this.rnd, r);
        if (this.targets.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 2.6 * r)) continue;
        this.targets.push({ ...p, r, born: this.t, life: 1.4 - 0.55 * prog, enemy: this.rnd() < 0.62 });
      }
      this.nextSpawn = this.t + 0.75 - 0.35 * prog;
    }
    for (const c of inp.clicks) {
      const hit = this.targets.find((t) => Math.hypot(c.x - t.x, c.y - t.y) <= t.r + 4);
      if (!hit) {
        this.misses++;
        this.add(-20);
        this.pop(c.x, c.y, "-20", "#f66");
        sfx.miss();
        continue;
      }
      this.targets = this.targets.filter((t) => t !== hit);
      if (hit.enemy) {
        const pts = 150 + Math.round(100 * Math.max(0, 1 - (this.t - hit.born) / hit.life));
        this.hits++;
        this.combo++;
        this.add(pts);
        this.pop(hit.x, hit.y, "+" + pts, "#ffb347");
        sfx.hit(this.combo);
      } else {
        this.allyHits++;
        this.combo = 0;
        this.add(-200);
        this.pop(hit.x, hit.y, "ALLY! -200", "#f66");
        sfx.bad();
      }
    }
    for (const t of this.targets) {
      if (this.t - t.born > t.life && t.enemy) {
        this.escaped++;
        this.combo = 0;
        this.add(-50);
        this.pop(t.x, t.y, "-50", "#f99");
      }
    }
    this.targets = this.targets.filter((t) => this.t - t.born <= t.life);
  }
  drawWorld(g: CanvasRenderingContext2D) {
    for (const t of this.targets) {
      const ring = (this.t - t.born) / t.life;
      if (t.enemy) drawTarget(g, t.x, t.y, t.r, "#ff8a3d", ring);
      else {
        drawTarget(g, t.x, t.y, t.r, "#3d8bff", ring);
        g.save();
        g.strokeStyle = "#cfe3ff";
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(t.x - t.r * 0.45, t.y);
        g.lineTo(t.x - t.r * 0.1, t.y + t.r * 0.35);
        g.lineTo(t.x + t.r * 0.5, t.y - t.r * 0.35);
        g.stroke();
        g.restore();
      }
    }
  }
  stats(): RoundStats {
    return { score: this.score, hits: this.hits, misses: this.misses, detail: `${this.hits} threats · ${this.allyHits} allies hit · ${this.escaped} escaped` };
  }
}

/** Rough "great run" score per round, used to turn raw points into a 0-100 skill rating. */
export const PAR = { flick: 7000, track: 3200, clutch: 5500 };

export function profile(s: { flick: number; track: number; clutch: number }) {
  const r = {
    flick: Math.min(100, Math.round((100 * s.flick) / PAR.flick)),
    track: Math.min(100, Math.round((100 * s.track) / PAR.track)),
    clutch: Math.min(100, Math.round((100 * s.clutch) / PAR.clutch)),
  };
  const vals = [r.flick, r.track, r.clutch];
  const spread = Math.max(...vals) - Math.min(...vals);
  let title: string;
  if (spread < 12) title = Math.min(...vals) >= 70 ? "Complete Pro" : "All-Rounder";
  else if (r.flick === Math.max(...vals)) title = "Flick Specialist";
  else if (r.track === Math.max(...vals)) title = "Tracking Machine";
  else title = "Clutch Brain";
  return { ...r, title };
}

/** Small deterministic RNG so the soak test is reproducible. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
