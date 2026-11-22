import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/ghost.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { GhostRecorder, ghostAt, daySeed, GHOST_HZ } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("recorder fills one sample per tick, even across dropped frames", () => {
  const r = new GhostRecorder();
  r.sample(0, 10, 20, 0, false);
  r.sample(0.5, 110, 120, 300, true); // 10 ticks later
  assert.equal(r.g.x.length, Math.floor(0.5 * GHOST_HZ) + 1);
  assert.equal(r.g.x.at(-1), 110);
  assert.deepEqual(r.g.shots, [10]);
});

test("ghostAt interpolates position and reports the last shot", () => {
  const g = { x: [0, 100], y: [0, 50], s: [0, 40], shots: [1] };
  const p = ghostAt(g, 0.5 / GHOST_HZ);
  assert.equal(p.x, 50);
  assert.equal(p.y, 25);
  assert.equal(p.shotAge, Infinity);
  const q = ghostAt(g, 5); // past the end: clamps to the last sample
  assert.equal(q.x, 100);
  assert.equal(q.score, 40);
  assert.equal(q.shotAge, 0);
  assert.equal(ghostAt({ x: [], y: [], s: [], shots: [] }, 1), null);
});

test("daySeed: same course all day, different per round and per day", () => {
  assert.equal(daySeed("2026-11-22", 1), daySeed("2026-11-22", 1));
  assert.notEqual(daySeed("2026-11-22", 1), daySeed("2026-11-22", 2));
  assert.notEqual(daySeed("2026-11-22", 1), daySeed("2026-11-23", 1));
});
