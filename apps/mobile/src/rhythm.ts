// Adapted from Utakt, Akademiet-ki-lab/Utakt, commit c20ffdd, level 1.
export const RHYTHM_BPM = 116;
export const RHYTHM_SECONDS = 60 / RHYTHM_BPM;
export const RHYTHM_DURATION = 128 * RHYTHM_SECONDS;
export const RHYTHM_WINDOW = 0.13;
export const cheeseChart = [
  2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 25, 26, 27, 28, 29, 30, 31,
].map((bar) => {
  const sock = [12, 14, 18, 22, 25, 28, 30].includes(bar);
  return {
    beat: bar * 4,
    sock,
    demo: bar === 2 || bar === 12,
    cues: sock ? [0, 1, 1.5] : [0, 1],
    note: sock ? 2.5 : 2,
  };
});
export const cheeseTargets = cheeseChart
  .filter((p) => !p.demo)
  .map((p) => (p.beat + p.note) * RHYTHM_SECONDS);
export function rhythmScore(taps: number[]) {
  const hit = new Set<number>();
  let extras = 0;
  for (const ms of taps) {
    const i = cheeseTargets.findIndex(
      (at, i) =>
        !hit.has(i) &&
        Math.abs(Math.round(at * 1000) - ms) <= RHYTHM_WINDOW * 1000,
    );
    if (i >= 0) hit.add(i);
    else extras++;
  }
  return { hits: hit.size, extras, win: hit.size >= 14 && extras <= 5 };
}
export function acceptsCheeseTap(seconds: number) {
  return cheeseChart.some(
    (p) =>
      !p.demo &&
      seconds / RHYTHM_SECONDS >= p.beat + 0.65 &&
      seconds / RHYTHM_SECONDS < p.beat + p.note + 0.65,
  );
}
export type RhythmPlayback = { time: () => number; stop: () => void };
