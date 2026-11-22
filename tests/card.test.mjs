import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/card.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { cardUrl, parseCard, DEFAULT_CARD_BASE } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

const card = { initials: "SHA", score: 8455, flick: 3100, track: 2900, clutch: 2455, day: "2026-11-22", rank: 1, runs: 40 };

test("card URL round-trips through the fragment", () => {
  const url = cardUrl(DEFAULT_CARD_BASE, card);
  assert.ok(url.startsWith(DEFAULT_CARD_BASE + "#"));
  assert.deepEqual(parseCard(new URL(url).hash), card);
});

test("URL stays short enough for an easy-to-scan QR code", () => {
  assert.ok(cardUrl(DEFAULT_CARD_BASE, card).length < 140);
});

test("malformed or hostile fragments are rejected or sanitised", () => {
  assert.equal(parseCard(""), null);
  assert.equal(parseCard("#i=SHA&s=abc&f=1&t=1&c=1&d=2026-11-22&r=1&n=1"), null);
  assert.equal(parseCard("#i=SHA&s=1&f=1&t=1&c=1&d=yesterday&r=1&n=1"), null);
  const p = parseCard("#i=<b>x&s=1&f=1&t=1&c=1&d=2026-11-22&r=1&n=1");
  assert.equal(p.initials, "BX");
});
