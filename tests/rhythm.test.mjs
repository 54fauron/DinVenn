import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  cheeseChart,
  cheeseTargets,
  rhythmScore,
  acceptsCheeseTap,
  RHYTHM_DURATION,
} from "../apps/mobile/src/rhythm.ts";
test("Utakt-nivået har to demonstrasjoner, 17 fangster og scoregrense", () => {
  assert.equal(cheeseChart.filter((p) => p.demo).length, 2);
  assert.equal(cheeseTargets.length, 17);
  const taps = cheeseTargets.map((t) => Math.round(t * 1000));
  assert.deepEqual(rhythmScore(taps), { hits: 17, extras: 0, win: true });
  assert.equal(rhythmScore(taps.slice(0, 13)).win, false);
  assert.equal(rhythmScore(taps.slice(0, 14)).win, true);
  assert.equal(
    rhythmScore([...taps, ...Array.from({ length: 6 }, (_, i) => 66000 + i)])
      .win,
    false,
  );
  assert.equal(acceptsCheeseTap(((8 + 2) * 60) / 116), false);
  assert.equal(acceptsCheeseTap(cheeseTargets[0]), true);
  assert.ok(RHYTHM_DURATION > 66 && RHYTHM_DURATION < 67);
});
test("det syntetiserte lydsporet dekker hele nivået", async () => {
  const bytes = await readFile("apps/mobile/assets/ost-pa-rommen.wav");
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  const duration = bytes.readUInt32LE(40) / bytes.readUInt32LE(28);
  assert.ok(duration >= RHYTHM_DURATION && duration < RHYTHM_DURATION + 0.5);
});
