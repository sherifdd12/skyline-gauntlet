// Second-monitor leaderboard. Same PC, no network: reads IndexedDB, updates live via BroadcastChannel.
import "./style.css";
import { profile } from "./game";
import { onBoardChange, runsForDay } from "./store";

const root = document.getElementById("board")!;
let flashId = "";

async function render() {
  const runs = await runsForDay();
  const top = runs.slice(0, 10);
  const best = { flick: 0, track: 0, clutch: 0 } as Record<string, number>;
  const who = { flick: "", track: "", clutch: "" } as Record<string, string>;
  for (const r of runs)
    for (const k of ["flick", "track", "clutch"] as const)
      if (r[k] > best[k]) (best[k] = r[k]), (who[k] = r.initials);
  root.innerHTML = `
    <header><h1>SKYLINE <span>GAUNTLET</span></h1><div class="sub">TODAY'S TOP 10 · ${runs.length} runs</div></header>
    <ol>${top
      .map((r, i) => `<li class="${r.id === flashId ? "flash" : ""}"><span class="pos">${i + 1}</span><span class="tag">${r.initials}</span><span class="ptitle">${profile(r).title}</span><span class="score">${r.score.toLocaleString()}</span></li>`)
      .join("") || '<li class="empty">Waiting for the first run…</li>'}</ol>
    <footer>
      ${(["flick", "track", "clutch"] as const).map((k) => `<div><small>BEST ${k.toUpperCase()}</small><b>${best[k] ? best[k].toLocaleString() : "—"}</b><em>${who[k]}</em></div>`).join("")}
    </footer>`;
}
onBoardChange((m) => {
  flashId = m.id ?? "";
  void render();
});
setInterval(render, 30000); // also picks up the day rollover at midnight
void render();
