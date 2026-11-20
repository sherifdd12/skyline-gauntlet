import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/gamepad.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { GamepadInput, moveCrosshair } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

function pad(index = 0, axes = [0, 0], down = []) {
  return {
    index, connected: true, axes,
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 })),
  };
}

test("deadzone, time-scaled movement, and canvas clamping", () => {
  const sampler = new GamepadInput();
  const idle = sampler.sample([pad(0, [0.1, 0])], 1);
  assert.equal(idle.dx, 0);
  assert.equal(idle.active, false);
  const half = sampler.sample([pad(0, [1, 0])], 0.5);
  const full = sampler.sample([pad(0, [1, 0])], 1);
  assert.equal(full.dx, half.dx * 2);
  const position = { x: 1500, y: 450 };
  moveCrosshair(position, full, 1600, 900);
  assert.deepEqual(position, { x: 1600, y: 450 });
  moveCrosshair(position, sampler.sample([pad(0, [-1, -1])], 10), 1600, 900);
  assert.deepEqual(position, { x: 0, y: 0 });
});

test("buttons are edge-triggered and held input remains active", () => {
  const sampler = new GamepadInput();
  assert.equal(sampler.sample([pad(0, [0, 0], [0, 7])], 0.1).pressed.has(0), true);
  const held = sampler.sample([pad(0, [0, 0], [0, 7])], 0.1);
  assert.equal(held.pressed.size, 0);
  assert.equal(held.active, true);
  sampler.sample([pad()], 0.1);
  assert.equal(sampler.sample([pad(0, [0, 0], [0])], 0.1).pressed.has(0), true);
  assert.equal(sampler.sample([pad(0, [0.12, 0.12])], 0.1).active, true);
  assert.equal(sampler.sample([pad(0, [0, 0, 0.5, 0])], 0.1).active, true);
});

test("multiple controllers maintain separate histories and reconnect cleanly", () => {
  const sampler = new GamepadInput();
  assert.equal(sampler.sample([null, pad(1, [0, 0], [0])], 0.1).connected, true);
  assert.equal(sampler.sample([pad(0, [0, 0], [0]), pad(1, [0, 0], [0])], 0.1).pressed.has(0), true);
  assert.equal(sampler.sample([], 0.1).connected, false);
  assert.equal(sampler.sample([pad(1, [0, 0], [0])], 0.1).pressed.has(0), true);
});