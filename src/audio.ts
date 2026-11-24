// Procedural sound effects (WebAudio). No audio files, so no copyright questions.
// Drone hit = laser zap + small filtered-noise explosion; pitch climbs with the combo.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
export let soundOn = true;
export function setSound(on: boolean) {
  soundOn = on;
}

function ac(): AudioContext | null {
  if (!soundOn) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.8;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.12, slide = 0, delay = 0) {
  const a = ac();
  if (!a || !master) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Filtered noise burst: a low "boom" when the cutoff sweeps down. */
function boom(dur: number, gain: number, from: number, to: number, delay = 0) {
  const a = ac();
  if (!a || !master || !noise) return;
  const t = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noise;
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export const sfx = {
  hit: (combo = 0) => {
    const up = Math.min(combo, 12) * 35;
    tone(1400 + up, 0.09, "square", 0.05, -1000); // laser zap
    boom(0.22, 0.35, 2600, 120, 0.02); // drone pops
    tone(110, 0.16, "sine", 0.22, -60, 0.02); // body thump
    if (combo >= 5) tone(880 + up, 0.08, "triangle", 0.05, 0, 0.06); // combo sparkle
  },
  miss: () => {
    tone(300, 0.08, "square", 0.03, -150);
    boom(0.06, 0.08, 900, 300);
  },
  bad: () => {
    tone(220, 0.12, "sawtooth", 0.08);
    tone(165, 0.18, "sawtooth", 0.08, 0, 0.13); // two-tone alarm
    boom(0.3, 0.3, 700, 80);
  },
  tick: () => tone(1500, 0.025, "sine", 0.03),
  go: () => {
    tone(660, 0.18, "square", 0.06, 660);
    boom(0.25, 0.12, 4000, 400);
  },
  count: () => tone(520, 0.1, "square", 0.05),
  record: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, "triangle", 0.15, 0, i * 0.11));
  },
  end: () => {
    tone(523, 0.15, "triangle", 0.12);
    tone(659, 0.15, "triangle", 0.12, 0, 0.14);
    tone(784, 0.3, "triangle", 0.14, 0, 0.28);
  },
};
