import type { RhythmPlayback } from "./rhythm";
export function preloadRhythm() {}
export async function startRhythmAudio(
  ready: Promise<unknown> = Promise.resolve(),
): Promise<RhythmPlayback> {
  const { createAudioPlayer, setAudioModeAsync } = await import("expo-audio");
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
  });
  const player = createAudioPlayer(require("../assets/ost-pa-rommen.wav"), {
    updateInterval: 50,
  });
  try {
    if (!player.isLoaded)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          subscription.remove();
          reject(Error("Lyden kunne ikke starte. Prøv igjen."));
        }, 12000);
        const subscription = player.addListener(
          "playbackStatusUpdate",
          (status) => {
            if (status.isLoaded) {
              clearTimeout(timer);
              subscription.remove();
              resolve();
            }
          },
        );
      });
    await ready;
    player.volume = 0.8;
    player.play();
    return {
      time: () => player.currentTime,
      stop: () => {
        player.pause();
        player.remove();
      },
    };
  } catch (error) {
    player.remove();
    throw error;
  }
}
