// Tiny procedural sound effects (WebAudio). No audio files, so no copyright questions.
let ctx: AudioContext | null = null;
export let soundOn = true;
export function setSound(on: boolean) {
  soundOn = on;
}

function ac(): AudioContext | null {
  if (!soundOn) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.12, slide = 0) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  hit: (combo = 0) => tone(660 + Math.min(combo, 12) * 40, 0.09, "triangle", 0.14),
  miss: () => tone(180, 0.12, "sawtooth", 0.06, -60),
  bad: () => tone(140, 0.25, "square", 0.08, -80),
  tick: () => tone(1200, 0.03, "square", 0.03),
  go: () => tone(880, 0.25, "triangle", 0.14, 440),
  count: () => tone(520, 0.12, "triangle", 0.1),
  end: () => {
    tone(523, 0.15, "triangle", 0.12);
    setTimeout(() => tone(659, 0.15, "triangle", 0.12), 140);
    setTimeout(() => tone(784, 0.3, "triangle", 0.14), 280);
  },
};
