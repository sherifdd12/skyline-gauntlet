// The phone-side skill card page (card.html). Reads the result from the URL fragment only.
import "./card.css";
import { profile } from "./game";
import { parseCard } from "./card";

const root = document.getElementById("card")!;
const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

function render() {
  const c = parseCard(location.hash);
  if (!c) {
    root.innerHTML = `<div class="sc"><div class="brand">SKYLINE <span>GAUNTLET</span></div><p class="muted">This card link looks incomplete. Scan the QR code at the booth again.</p></div>`;
    return;
  }
  const p = profile(c);
  const bar = (name: string, v: number) =>
    `<div class="row"><span>${name}</span><div class="track"><div class="fill" style="width:${v}%"></div></div><b>${v}</b></div>`;
  const date = new Date(c.day + "T12:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  root.innerHTML = `
    <div class="sc">
      <div class="brand">SKYLINE <span>GAUNTLET</span></div>
      <div class="tag">${esc(c.initials)}</div>
      <div class="ptitle">${esc(p.title)}</div>
      <div class="score">${c.score.toLocaleString()}</div>
      <div class="muted">#${c.rank} of ${c.runs} runs · ${esc(date)}</div>
      <div class="bars">${bar("Flick", p.flick)}${bar("Track", p.track)}${bar("Clutch", p.clutch)}</div>
      <div class="muted small">Screenshot this card and share it. Think you can do better? Come back to the booth.</div>
    </div>`;
  document.title = `${c.initials} · ${p.title} · Skyline Gauntlet`;
}
addEventListener("hashchange", render);
render();
