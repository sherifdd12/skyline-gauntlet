import "./style.css";
import { sfx, setSound, soundOn } from "./audio";
import { Clutch, Flick, H, Input, Round, ROUND_SECONDS, Track, W, drawTarget, mulberry32, profile } from "./game";
import { drawCity, drawFlash, drawFx, drawReticle, shakeOffset, stepFx } from "./fx";
import { Run, cleanInitials, clearDay, percentile, runsForDay, saveRun, toCSV, today, allRuns, onBoardChange } from "./store";
import { GamepadInput, moveCrosshair } from "./gamepad";
import { Ghost, GhostRecorder, daySeed, ghostAt } from "./ghost";
import { DEFAULT_CARD_BASE, cardUrl } from "./card";
import qrcode from "qrcode-generator";

// ---------- config (URL params let booth staff tune without rebuilding) ----------
const params = new URLSearchParams(location.search);
const PIN = params.get("pin") ?? "0909";
const CARD_BASE = params.get("card") ?? DEFAULT_CARD_BASE; // where the phone opens the skill card
// ?demo=TAG,TAG2,...: hands-free showcase (autoplay without the soak overlay, real tags, QR shown).
const DEMO_TAGS = (params.get("demo") ?? "").split(",").filter(Boolean);
const demo = DEMO_TAGS.length > 0;
const IDLE_RESULTS = 25; // seconds before results/initials auto-finish
const IDLE_ROUND = 12; // seconds without any input during a round = player walked away

// ---------- canvas setup ----------
const canvas = document.getElementById("game") as HTMLCanvasElement;
const g = canvas.getContext("2d")!;
let scale = 1, offX = 0, offY = 0;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  scale = Math.min(canvas.width / W, canvas.height / H);
  offX = (canvas.width - W * scale) / 2;
  offY = (canvas.height - H * scale) / 2;
}
addEventListener("resize", resize);
resize();

const input: Input = { x: W / 2, y: H / 2, clicks: [] };
let lastInput = performance.now();
const gamepad = new GamepadInput();
let controllerConnected = false;
function toLogical(e: PointerEvent) {
  const dpr = window.devicePixelRatio || 1;
  return { x: (e.clientX * dpr - offX) / scale, y: (e.clientY * dpr - offY) / scale };
}
canvas.addEventListener("pointermove", (e) => {
  const p = toLogical(e);
  input.x = p.x;
  input.y = p.y;
  lastInput = performance.now();
});
canvas.addEventListener("pointerdown", (e) => {
  const p = toLogical(e);
  input.x = p.x;
  input.y = p.y;
  input.clicks.push(p);
  lastInput = performance.now();
  onClick();
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// ---------- state machine ----------
type State = "attract" | "countdown" | "intro" | "play" | "results" | "initials" | "saved";
let state: State = "attract";
let stateT = 0;
let rounds: Round[] = [];
let ri = 0;
let result: { flick: number; track: number; clutch: number; total: number; details: string[] } | null = null;
let todayRuns: Run[] = [];
let rankInfo = { rank: 0, pct: 0, record: false };
let savedId = "";
let bot = false; // soak-test autoplay
let botSessions = 0;
// Ghost Duel: record this run, race today's best recorded run
let rec = new GhostRecorder();
let rival: { ghost: Ghost; initials: string; score: number } | null = null;
let ghostDiff: number | null = null;
let savedRun: Run | null = null;

function qrSvg(text: string): string {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 5, margin: 3, scalable: true });
}

async function refreshBoard() {
  todayRuns = await runsForDay();
}
void refreshBoard();
onBoardChange(() => void refreshBoard());

function go(s: State) {
  state = s;
  stateT = 0;
  input.clicks = [];
  ui.render();
}

function startGame() {
  // Humans all play today's course (same seed per round), so the ghost race is fair.
  const day = today();
  const rnd = (k: number) => (bot ? mulberry32(botSessions * 3 + k) : mulberry32(daySeed(day, k)));
  rounds = [new Flick(rnd(1)), new Track(rnd(2)), new Clutch(rnd(3))];
  ri = 0;
  result = null;
  savedId = "";
  rec = new GhostRecorder();
  ghostDiff = null;
  savedRun = null;
  const best = todayRuns.find((r) => r.ghost && r.ghost.x.length > 0);
  rival = best && best.ghost ? { ghost: best.ghost, initials: best.initials, score: best.score } : null;
  go("countdown");
}

function finishGame() {
  const s = rounds.map((r) => r.stats());
  const [flick, track, clutch] = s.map((x) => x.score);
  result = { flick, track, clutch, total: flick + track + clutch, details: s.map((x) => x.detail) };
  const better = todayRuns.filter((r) => r.score > result!.total).length;
  const record = better === 0 && todayRuns.length > 0 && result.total > 0;
  rankInfo = { rank: better + 1, pct: percentile(result.total, todayRuns), record };
  ghostDiff = rival ? result.total - rival.score : null;
  if (record) sfx.record();
  else sfx.end();
  go("results");
}

async function save(initials: string) {
  if (!result || savedId) return;
  const run: Run = {
    id: crypto.randomUUID(),
    initials: cleanInitials(initials),
    score: result.total,
    flick: result.flick,
    track: result.track,
    clutch: result.clutch,
    ts: Date.now(),
    day: today(),
    ghost: rec.g,
  };
  savedId = run.id;
  savedRun = run;
  await saveRun(run);
  await refreshBoard();
  go("saved");
}

function onClick() {
  if (staff.open) return;
  if (state === "attract") startGame();
  else if (state === "results" && stateT > 1.2) go("initials");
  else if (state === "saved" && stateT > 1.5) go("attract");
}

// ---------- DOM overlays (results card, initials picker, staff panel) ----------
const overlay = document.getElementById("overlay")!;
const ui = {
  render() {
    controllerInitials = null;
    overlay.innerHTML = "";
    overlay.hidden = !(state === "results" || state === "initials" || state === "saved");
    if (overlay.hidden || !result) return;
    const p = profile(result);
    const card = document.createElement("div");
    card.className = "card";
    if (state === "results") {
      card.innerHTML = `
        <div class="eyebrow">RUN COMPLETE</div>
        <div class="big">${result.total.toLocaleString()}</div>
        <div class="title">${p.title}</div>
        <div class="bars">
          ${bar("Flick", p.flick, result.details[0])}
          ${bar("Track", p.track, result.details[1])}
          ${bar("Clutch", p.clutch, result.details[2])}
        </div>
        ${rankInfo.record ? '<div class="record">NEW #1 TODAY!</div>' : ""}
        ${rival && ghostDiff !== null ? `<div class="rank">${ghostDiff > 0 ? "You beat" : "You lost to"} ${rival.initials}'s ghost by ${Math.abs(ghostDiff).toLocaleString()}</div>` : ""}
        <div class="rank">#${rankInfo.rank} today · better than ${rankInfo.pct}% of runs</div>
        <button class="primary" id="toInitials">SAVE MY SCORE</button>`;
    } else if (state === "initials") {
      card.innerHTML = `
        <div class="eyebrow">ENTER YOUR TAG</div>
        <div class="wheels">${[0, 1, 2].map((i) => `<div class="wheel" data-i="${i}"><button class="up">▲</button><div class="ch">A</div><button class="down">▼</button></div>`).join("")}</div>
        <button class="primary" id="saveBtn">SAVE</button>`;
    } else {
      const pos = todayRuns.findIndex((r) => r.id === savedId) + 1;
      const qr =
        savedRun && (!bot || demo)
          ? `<div class="qr">${qrSvg(cardUrl(CARD_BASE, { initials: savedRun.initials, score: savedRun.score, flick: savedRun.flick, track: savedRun.track, clutch: savedRun.clutch, day: savedRun.day, rank: pos || rankInfo.rank, runs: Math.max(todayRuns.length, pos) }))}<div class="qrcap">Scan to take your skill card home</div></div>`
          : "";
      card.innerHTML = `
        <div class="eyebrow">SAVED</div>
        <div class="big">#${pos || rankInfo.rank}</div>
        <div class="title">on today's board — check the big screen!</div>
        ${qr}
        <button class="primary" id="doneBtn">NEXT PLAYER</button>`;
    }
    overlay.appendChild(card);
    card.querySelector("#toInitials")?.addEventListener("click", () => go("initials"));
    card.querySelector("#doneBtn")?.addEventListener("click", () => go("attract"));
    if (state === "initials") {
      const letters = ["A", "A", "A"];
      const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const wheels = card.querySelectorAll<HTMLElement>(".wheel");
      const draw = () => wheels.forEach((w, i) => (w.querySelector(".ch")!.textContent = letters[i]));
      const turn = (i: number, d: number) => {
        letters[i] = A[(A.indexOf(letters[i]) + d + A.length) % A.length];
        sfx.tick();
        lastInput = performance.now();
        draw();
      };
      wheels.forEach((w, i) => {
        w.querySelector(".up")!.addEventListener("click", () => turn(i, -1));
        w.querySelector(".down")!.addEventListener("click", () => turn(i, 1));
        w.addEventListener("wheel", (e) => turn(i, Math.sign((e as WheelEvent).deltaY)));
      });
      let selected = 0;
      controllerInitials = (pressed) => {
        if (pressed.has(14)) selected = Math.max(0, selected - 1);
        if (pressed.has(15)) selected = Math.min(2, selected + 1);
        wheels.forEach((w, i) => w.classList.toggle("selected", i === selected));
        if (pressed.has(12)) turn(selected, -1);
        if (pressed.has(13)) turn(selected, 1);
        if (pressed.has(0)) void save(letters.join(""));
      };
      let cursor = 0;
      keyHandler = (e) => {
        if (/^[a-z0-9]$/i.test(e.key) && cursor < 3) {
          letters[cursor++] = e.key.toUpperCase();
          draw();
        } else if (e.key === "Backspace" && cursor > 0) letters[--cursor] = "A", draw();
        else if (e.key === "Enter") void save(letters.join(""));
      };
      card.querySelector("#saveBtn")!.addEventListener("click", () => void save(letters.join("")));
    } else keyHandler = null;
  },
};
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let controllerInitials: ((pressed: Set<number>) => void) | null = null;
function bar(name: string, v: number, detail: string) {
  return `<div class="bar"><span>${name}</span><div class="track"><div class="fill" style="width:${v}%"></div></div><b>${v}</b><small>${detail}</small></div>`;
}
overlay.addEventListener("pointermove", () => (lastInput = performance.now()));
overlay.addEventListener("pointerdown", () => (lastInput = performance.now()));

// ---------- staff panel (Ctrl+Shift+S, PIN) ----------
const staffEl = document.getElementById("staff")!;
const staff = {
  open: false,
  show() {
    staff.open = true;
    staffEl.hidden = false;
    staffEl.innerHTML = `<div class="card"><div class="eyebrow">STAFF</div>
      <input id="pin" type="password" inputmode="numeric" placeholder="PIN" autocomplete="off"/>
      <div id="tools" hidden>
        <button id="sReset">Reset today's board</button>
        <button id="sCsv">Export all runs (CSV)</button>
        <button id="sSound">Sound: ${soundOn ? "ON" : "OFF"}</button>
        <button id="sBoard">Open leaderboard window</button>
        <button id="sBot">${bot ? "Stop" : "Start"} soak test (autoplay)</button>
        <div id="sMsg" class="muted"></div>
      </div>
      <button id="sClose">Close</button></div>`;
    const pin = staffEl.querySelector<HTMLInputElement>("#pin")!;
    const tools = staffEl.querySelector<HTMLElement>("#tools")!;
    const msg = (t: string) => (staffEl.querySelector("#sMsg")!.textContent = t);
    pin.focus();
    pin.addEventListener("input", () => {
      if (pin.value === PIN) {
        pin.hidden = true;
        tools.hidden = false;
      }
    });
    let armed = false;
    staffEl.querySelector("#sReset")!.addEventListener("click", async (e) => {
      if (!armed) {
        armed = true;
        (e.target as HTMLElement).textContent = "Click again to confirm reset";
        return;
      }
      await clearDay();
      await refreshBoard();
      msg("Today's board cleared.");
    });
    staffEl.querySelector("#sCsv")!.addEventListener("click", async () => {
      const blob = new Blob([toCSV(await allRuns())], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `skyline-runs-${today()}.csv`;
      a.click();
      msg("CSV exported.");
    });
    staffEl.querySelector("#sSound")!.addEventListener("click", (e) => {
      setSound(!soundOn);
      (e.target as HTMLElement).textContent = `Sound: ${soundOn ? "ON" : "OFF"}`;
    });
    staffEl.querySelector("#sBoard")!.addEventListener("click", () => window.open("board.html", "skyline-board"));
    staffEl.querySelector("#sBot")!.addEventListener("click", () => {
      bot = !bot;
      botSessions = 0;
      soak.start = performance.now();
      soak.minFps = 999;
      staff.hide();
      if (bot) startGame();
      else go("attract");
    });
    staffEl.querySelector("#sClose")!.addEventListener("click", () => staff.hide());
  },
  hide() {
    staff.open = false;
    staffEl.hidden = true;
    staffEl.innerHTML = "";
  },
};
addEventListener("keydown", (e) => {
  lastInput = performance.now();
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") {
    e.preventDefault();
    staff.open ? staff.hide() : staff.show();
    return;
  }
  if (staff.open) return;
  if (keyHandler) keyHandler(e);
  else if (e.key === " " || e.key === "Enter") onClick();
});

// ---------- soak test bot: plays real sessions with simulated human-ish aim ----------
const soak = { start: 0, minFps: 999, fps: 60 };
let botCooldown = 0;
function botInput(dt: number) {
  if (state === "play") {
    const aim = rounds[ri].aimPoint();
    if (!aim) return;
    const k = Math.min(1, dt * 9);
    input.x += (aim.x - input.x) * k + (Math.random() - 0.5) * 6;
    input.y += (aim.y - input.y) * k + (Math.random() - 0.5) * 6;
    botCooldown -= dt;
    if (aim.shoot && botCooldown <= 0 && Math.hypot(aim.x - input.x, aim.y - input.y) < 18) {
      input.clicks.push({ x: input.x, y: input.y });
      botCooldown = 0.18 + Math.random() * 0.25;
    }
    lastInput = performance.now();
  } else if (state === "results" && stateT > (demo ? 4 : 1.5)) go("initials");
  else if (state === "initials" && stateT > 0.8) void save(demo ? DEMO_TAGS[botSessions % DEMO_TAGS.length] : "BOT");
  else if (state === "saved" && stateT > (demo ? 6 : 1)) {
    botSessions++;
    startGame();
  }
}

// ---------- background ----------
// Neon night city (fx.ts). Dimmed during play so the drones stay readable.
let bgT = 0;
function drawBackground(dt: number) {
  bgT += dt;
  drawCity(g, W, H, bgT, state === "play" ? 0.3 : state === "attract" ? 0.05 : 0.2);
}

function text(s: string, x: number, y: number, size: number, color = "#fff", align: CanvasTextAlign = "center", weight = 800, outline = false) {
  g.font = `${weight} ${size}px "Segoe UI", system-ui, sans-serif`;
  g.textAlign = align;
  g.textBaseline = "middle";
  if (outline) {
    g.lineJoin = "round";
    g.lineWidth = Math.max(4, size * 0.16);
    g.strokeStyle = "rgba(5,6,26,0.85)";
    g.strokeText(s, x, y);
  }
  g.fillStyle = color;
  g.fillText(s, x, y);
}

function drawCrosshair() {
  drawReticle(g, input.x, input.y, bgT);
}

// ---------- main loop ----------
let last = performance.now();
let fpsAcc = 0, fpsN = 0;
function connectedGamepads(): readonly (Gamepad | null)[] {
  try {
    return navigator.getGamepads?.() ?? [];
  } catch {
    return [];
  }
}
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  stateT += dt;
  const pad = gamepad.sample(connectedGamepads(), dt);
  controllerConnected = pad.connected;
  if (pad.active) lastInput = now;
  if (!staff.open) {
    moveCrosshair(input, pad, W, H);
    if (state === "initials") {
      if (pad.pressed.size) controllerInitials?.(pad.pressed);
    } else if (pad.pressed.has(0) || pad.pressed.has(7) || (state === "attract" && pad.pressed.has(9))) {
      input.clicks.push({ x: input.x, y: input.y });
      onClick();
    }
  }
  fpsAcc += dt;
  fpsN++;
  if (fpsAcc >= 1) {
    soak.fps = fpsN / fpsAcc;
    if (bot && performance.now() - soak.start > 3000) soak.minFps = Math.min(soak.minFps, soak.fps);
    fpsAcc = 0;
    fpsN = 0;
  }
  if (bot) botInput(dt);
  const idle = (now - lastInput) / 1000;

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "#000";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.setTransform(scale, 0, 0, scale, offX, offY);
  g.save();
  g.beginPath();
  g.rect(0, 0, W, H);
  g.clip();
  drawBackground(dt);

  if (state === "attract") drawAttract();
  else if (state === "countdown") {
    const n = 3 - Math.floor(stateT);
    if (Math.floor(stateT - dt) !== Math.floor(stateT)) n > 0 ? sfx.count() : sfx.go();
    text(n > 0 ? String(n) : "GO!", W / 2, H / 2, 220, "#7fd4ff");
    text("3 rounds · 20 seconds each", W / 2, H / 2 + 160, 34, "#9cc");
    if (stateT >= 3.4) go("intro");
  } else if (state === "intro") {
    const r = rounds[ri];
    text(`ROUND ${ri + 1} / 3`, W / 2, H / 2 - 120, 36, "#9cc", "center", 600);
    text(r.title, W / 2, H / 2 - 20, 160, "#ffffff");
    text(r.hint, W / 2, H / 2 + 100, 40, "#7fd4ff", "center", 600);
    if (stateT >= 1.8) {
      sfx.go();
      lastInput = now;
      go("play");
    }
  } else if (state === "play") {
    const r = rounds[ri];
    const shot = input.clicks.length > 0;
    r.update(dt, input);
    input.clicks = [];
    const playT = ri * ROUND_SECONDS + r.t;
    rec.sample(playT, input.x, input.y, runTotal(r), shot);
    stepFx(dt);
    const sh = shakeOffset();
    g.save();
    g.translate(sh.x, sh.y);
    r.drawWorld(g);
    drawFx(g);
    for (const p of r.pops) {
      g.globalAlpha = Math.min(1, 2.5 * (1 - p.age / 0.8));
      text(p.text, p.x, p.y - p.age * 70, 34 + 10 * Math.max(0, 0.15 - p.age) / 0.15, p.color, "center", 900, true);
    }
    g.globalAlpha = 1;
    drawGhost(playT);
    g.restore();
    drawFlash(g, W, H);
    drawHud(r, playT);
    if (idle > IDLE_ROUND && !bot) go("attract"); // player left mid-run: discard
    else if (r.done) {
      ri++;
      if (ri < rounds.length) go("intro");
      else finishGame();
    }
  } else {
    if (idle > IDLE_RESULTS && !bot) {
      if (state === "saved") go("attract");
      else void save("---"); // keep the score even if they walked off, then reset
    }
  }
  if (state === "play" || state === "attract") drawCrosshair();
  if (bot && !demo) drawSoakHud();
  g.restore();
  requestAnimationFrame(frame);
}

function runTotal(r: Round) {
  return rounds.slice(0, ri).reduce((a, x) => a + x.stats().score, 0) + Math.round(r.score);
}

function drawGhost(playT: number) {
  if (!rival) return;
  const p = ghostAt(rival.ghost, playT);
  if (!p) return;
  g.save();
  g.globalAlpha = 0.55;
  g.strokeStyle = "#ffd36b";
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(p.x, p.y, 13, 0, Math.PI * 2);
  g.stroke();
  if (p.shotAge < 0.25) {
    // ghost fired: expanding ring
    g.globalAlpha = 0.6 * (1 - p.shotAge / 0.25);
    g.beginPath();
    g.arc(p.x, p.y, 13 + p.shotAge * 120, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 0.7;
  text(rival.initials, p.x, p.y - 30, 20, "#ffd36b", "center", 700);
  g.restore();
}

function drawHud(r: Round, playT: number) {
  const total = runTotal(r);
  // glass HUD bar
  const hud = g.createLinearGradient(0, 0, 0, 96);
  hud.addColorStop(0, "rgba(10,8,36,0.85)");
  hud.addColorStop(1, "rgba(10,8,36,0.55)");
  g.fillStyle = hud;
  g.fillRect(0, 0, W, 90);
  text(r.title, 60, 50, 34, "#39e6ff", "left");
  text(total.toLocaleString(), W / 2, 50, 48, "#fff");
  if (rival) {
    const p = ghostAt(rival.ghost, playT);
    if (p) {
      const d = total - p.score;
      text(`vs ${rival.initials}'s ghost  ${d >= 0 ? "+" : "−"}${Math.abs(d).toLocaleString()}`, W / 2, 130, 28, d >= 0 ? "#7dffa8" : "#ff8a3d", "center", 700);
    }
  }
  text(r.left.toFixed(1) + "s", W - 60, 50, 40, r.left < 5 ? "#ff8a3d" : "#fff", "right");
  g.fillStyle = "#ffffff22";
  g.fillRect(0, 90, W, 6);
  const bar = g.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, "#39e6ff");
  bar.addColorStop(1, "#ff3d9a");
  g.fillStyle = bar;
  g.fillRect(0, 90, W * (r.t / ROUND_SECONDS), 6);
  if (r.combo >= 3 && r.key !== "track") text(`x${r.combo} STREAK`, W - 60, 130, 28 + Math.min(r.combo, 10), "#ffd36b", "right", 900, true);
  if (r.key === "track" && r.combo > 0) text("LOCKED ON", W - 60, 130, 28, "#5dffa8", "right", 900, true);
}

function drawAttract() {
  const t = stateT;
  // demo targets floating
  for (let i = 0; i < 6; i++) {
    // keep demo targets in the side lanes so they never cover the title or the top-5 list
    const side = i % 2 ? 1 : -1;
    const x = W / 2 + side * (560 + Math.sin(t * 0.7 + i) * 110);
    const y = 170 + ((i * 140 + t * 60) % 640);
    drawTarget(g, x, y, 30, i % 2 ? "#ff8a3d" : "#39e6ff", 1);
  }
  g.save();
  g.shadowColor = "#ff3d9a";
  g.shadowBlur = 30;
  text("SKYLINE", W / 2, 170, 150, "#ffffff", "center", 900, true);
  g.shadowColor = "#39e6ff";
  text("GAUNTLET", W / 2, 285, 80, "#39e6ff", "center", 800, true);
  g.restore();
  text("Flick · Track · Clutch — 60 seconds to prove your aim", W / 2, 370, 32, "#dde6ff", "center", 600, true);
  const pulse = 0.6 + 0.4 * Math.sin(t * 4);
  text("CLICK ANYWHERE TO PLAY", W / 2, 470, 50, `rgba(255,255,255,${pulse})`);
  const champ = todayRuns[0];
  if (champ && champ.ghost) text(`Race ${champ.initials}'s ghost on today's course`, W / 2, 422, 26, "#ffd36b", "center", 600);
  if (controllerConnected) text("🎮 Controller connected", W / 2, 525, 24, "#bcd", "center", 500);
  // today's top 5
  text("TODAY'S TOP 5", W / 2, 580, 28, "#7fd4ff", "center", 700);
  const top = todayRuns.slice(0, 5);
  if (!top.length) text("No runs yet — be the first!", W / 2, 640, 30, "#9ab", "center", 500);
  top.forEach((r, i) => {
    const y = 630 + i * 46;
    text(`${i + 1}`, W / 2 - 220, y, 30, "#7fd4ff", "left");
    text(r.initials, W / 2 - 160, y, 30, "#fff", "left");
    text(r.score.toLocaleString(), W / 2 + 220, y, 30, "#fff", "right");
  });
}

function drawSoakHud() {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  const mins = (performance.now() - soak.start) / 60000;
  const lines = [
    "SOAK TEST (autoplay)",
    `sessions: ${botSessions}`,
    `running: ${mins.toFixed(1)} min`,
    `fps: ${soak.fps.toFixed(0)} (min ${soak.minFps === 999 ? "-" : soak.minFps.toFixed(0)})`,
    mem ? `heap: ${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB` : "heap: n/a",
  ];
  g.fillStyle = "#000a";
  g.fillRect(W - 330, H - 190, 310, 170);
  lines.forEach((l, i) => text(l, W - 315, H - 165 + i * 32, 22, i ? "#cfe" : "#ffd36b", "left", 600));
}

// expose for automated tests
(window as unknown as { skyline: object }).skyline = {
  get state() {
    return state;
  },
  startBot: () => {
    bot = true;
    botSessions = 0;
    soak.start = performance.now();
    startGame();
  },
  get sessions() {
    return botSessions;
  },
};

if (demo)
  setTimeout(() => {
    bot = true;
    botSessions = 0;
    startGame();
  }, 2500);

requestAnimationFrame(frame);
