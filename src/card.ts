// Skill card: after saving, the player scans a QR code and takes their result home on their phone.
// Everything the card needs is packed into the URL fragment, so no server and no booth Wi-Fi are needed:
// the phone opens the static card page on its own mobile data.

export const DEFAULT_CARD_BASE = "https://sherifdd12.github.io/skyline-gauntlet/card.html";

export interface CardData {
  initials: string;
  score: number;
  flick: number;
  track: number;
  clutch: number;
  day: string; // YYYY-MM-DD
  rank: number; // rank on the day's board when saved
  runs: number; // runs on the board that day
}

export function cardUrl(base: string, c: CardData): string {
  const p = new URLSearchParams({
    i: c.initials,
    s: String(c.score),
    f: String(c.flick),
    t: String(c.track),
    c: String(c.clutch),
    d: c.day,
    r: String(c.rank),
    n: String(c.runs),
  });
  return `${base}#${p.toString()}`;
}

/** Parse a card fragment. Returns null for anything malformed, so a bad link shows a friendly page. */
export function parseCard(hash: string): CardData | null {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const num = (k: string) => {
    const v = Number(p.get(k));
    return Number.isFinite(v) && v >= 0 && v < 1e7 ? Math.round(v) : null;
  };
  const initials = (p.get("i") ?? "").toUpperCase().replace(/[^A-Z0-9!-]/g, "").slice(0, 3);
  const day = p.get("d") ?? "";
  const vals = { score: num("s"), flick: num("f"), track: num("t"), clutch: num("c"), rank: num("r"), runs: num("n") };
  if (!initials || !/^\d{4}-\d{2}-\d{2}$/.test(day) || Object.values(vals).some((v) => v === null)) return null;
  return { initials, day, ...(vals as Record<keyof typeof vals, number>) };
}
