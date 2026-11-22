// Ghost Duel: every run records its crosshair path and running score. The next players race
// a translucent "ghost" of today's #1 run, live, on the same course (same daily seed), and see
// a live +/- against it. Stored with the run in IndexedDB, so it works offline like the board.

export const GHOST_HZ = 20; // samples per second of play time

export interface Ghost {
  x: number[]; // crosshair x per sample (logical px, rounded)
  y: number[];
  s: number[]; // running total score per sample
  shots: number[]; // sample index of each shot
}

export class GhostRecorder {
  g: Ghost = { x: [], y: [], s: [], shots: [] };
  /** Call every frame during play with global play time (seconds across all rounds). */
  sample(time: number, x: number, y: number, score: number, shot: boolean) {
    const i = Math.floor(time * GHOST_HZ);
    while (this.g.x.length <= i) {
      this.g.x.push(Math.round(x));
      this.g.y.push(Math.round(y));
      this.g.s.push(Math.round(score));
    }
    if (shot) this.g.shots.push(i);
  }
}

export interface GhostPose {
  x: number;
  y: number;
  score: number;
  shotAge: number; // seconds since the ghost's last shot (Infinity if none yet)
}

/** Ghost position and score at global play time `time`, interpolated between samples. */
export function ghostAt(g: Ghost, time: number): GhostPose | null {
  const n = g.x.length;
  if (n === 0) return null;
  const f = Math.max(0, Math.min(n - 1, time * GHOST_HZ));
  const i = Math.floor(f);
  const j = Math.min(n - 1, i + 1);
  const k = f - i;
  let shotAge = Infinity;
  for (let a = g.shots.length - 1; a >= 0; a--) {
    if (g.shots[a] <= f) {
      shotAge = (f - g.shots[a]) / GHOST_HZ;
      break;
    }
  }
  return { x: g.x[i] + (g.x[j] - g.x[i]) * k, y: g.y[i] + (g.y[j] - g.y[i]) * k, score: g.s[i], shotAge };
}

/** Same course for everyone on the same day, so racing the ghost is fair. One stream per round. */
export function daySeed(day: string, round: number): number {
  let h = 2166136261;
  for (const c of day + "#" + round) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
