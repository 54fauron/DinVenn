import type { RhythmPlayback } from "./rhythm";
let bytes: Promise<ArrayBuffer> | null = null;
function load() {
  return (bytes ??= fetch(
    new URL("../assets/ost-pa-rommen.wav", import.meta.url).href,
  ).then((r) => {
    if (!r.ok) throw Error("Lyden kunne ikke starte. Prøv igjen.");
    return r.arrayBuffer();
  }));
}
export function preloadRhythm() {
  void load().catch(() => {
    bytes = null;
  });
}
export async function startRhythmAudio(
  ready: Promise<unknown> = Promise.resolve(),
): Promise<RhythmPlayback> {
  const Engine =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!Engine) throw Error("Lyden kunne ikke starte. Prøv igjen.");
  const context = new Engine();
  try {
    await context.resume();
    const buffer = await context.decodeAudioData((await load()).slice(0));
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    await ready;
    const zero = context.currentTime + 0.12;
    source.start(zero);
    return {
      time: () => context.currentTime - zero,
      stop: () => {
        try {
          source.stop();
        } catch {}
        void context.close();
      },
    };
  } catch (error) {
    void context.close();
    throw error;
  }
}
