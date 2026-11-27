import { CheeseArt } from "./CheeseArt";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  AppState,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { api, message, t, type Client, type DealGame } from "@dinvenn/core";
import { ui, palette } from "./ui";
import { themeStyles } from "./theme";
import { preloadRhythm, startRhythmAudio } from "./RhythmAudio";
import {
  acceptsCheeseTap,
  cheeseChart,
  cheeseTargets,
  rhythmScore,
  RHYTHM_DURATION,
  RHYTHM_SECONDS,
  type RhythmPlayback,
} from "./rhythm";
export function RhythmBoard({
  db,
  game,
  onUpdate,
}: {
  db?: Client;
  game?: DealGame;
  onUpdate?: (game: DealGame) => void;
}) {
  const [phase, setPhase] = useState<"ready" | "loading" | "playing" | "done">(
      "ready",
    ),
    [elapsed, setElapsed] = useState(0),
    [feedback, setFeedback] = useState(""),
    [error, setError] = useState(""),
    [score, setScore] = useState<{
      hits: number;
      extras: number;
      win: boolean;
    } | null>(null),
    [reduced, setReduced] = useState(true);
  const audio = useRef<RhythmPlayback | null>(null),
    frame = useRef(0),
    ticket = useRef(0),
    taps = useRef<number[]>([]),
    running = useRef(false),
    feedbackAt = useRef(-10),
    pressStarted = useRef(false);
  const finishRef = useRef<(times: number[]) => Promise<void>>(async () => {});
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  function stop() {
    running.current = false;
    cancelAnimationFrame(frame.current);
    audio.current?.stop();
    audio.current = null;
  }
  useEffect(() => {
    preloadRhythm();
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduced(v);
    });
    const reduceListener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    const interrupt = () => {
      if (phaseRef.current === "playing" || phaseRef.current === "loading") {
        ticket.current++;
        stop();
        setPhase("ready");
        setFeedback("");
        setError(t("Runden ble avbrutt. Start på nytt når du er klar."));
      }
    };
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") interrupt();
    });
    const visibility = () => {
      if (document.hidden) interrupt();
    };
    if (Platform.OS === "web")
      document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false;
      ticket.current++;
      stop();
      listener.remove();
      reduceListener.remove();
      if (Platform.OS === "web")
        document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  function catchCheese() {
    if (!running.current || !audio.current) return;
    const seconds = audio.current.time();
    if (!acceptsCheeseTap(seconds) || taps.current.length >= 128) return;
    const ms = Math.round(seconds * 1000);
    if (taps.current.at(-1) === ms) return;
    taps.current.push(ms);
    const next = rhythmScore(taps.current);
    setScore(next);
    feedbackAt.current = seconds;
    setFeedback(next.hits > (score?.hits ?? 0) ? "hit" : "miss");
  }
  const catchRef = useRef(catchCheese);
  catchRef.current = catchCheese;
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const key = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || !running.current) return;
      const element = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) return;
      if (
        element.closest('button,[role="button"]') &&
        element
          .closest('button,[role="button"]')
          ?.getAttribute("data-testid") !== "rhythm-catch"
      )
        return;
      event.preventDefault();
      catchRef.current();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  async function start() {
    const id = ++ticket.current;
    stop();
    setPhase("loading");
    setError("");
    setScore(null);
    setFeedback("");
    setElapsed(0);
    taps.current = [];
    let session = game;
    try {
      // Start the audio context directly from the user's gesture before the network request.
      const sessionPromise =
        db && game ? api(db).playGame(game, -2) : Promise.resolve(game);
      const playbackPromise = startRhythmAudio(sessionPromise);
      let playback: RhythmPlayback;
      try {
        const values = await Promise.all([playbackPromise, sessionPromise]);
        playback = values[0];
        session = values[1];
      } catch (e) {
        void playbackPromise.then(
          (p) => p.stop(),
          () => {},
        );
        throw e;
      }
      if (id !== ticket.current) {
        playback.stop();
        return;
      }
      audio.current = playback;
      if (session) onUpdate?.(session);
      running.current = true;
      setPhase("playing");
      let last = -1;
      finishRef.current = async (times) => {
        const local = rhythmScore(times);
        setPhase("loading");
        try {
          if (db && session) {
            const finished = await api(db).finishRhythm(session, times);
            if (id !== ticket.current) return;
            onUpdate?.(finished);
            setScore({
              hits: finished.state.hits ?? 0,
              extras: finished.state.extras ?? 0,
              win: finished.completed,
            });
          } else setScore(local);
          if (id === ticket.current) setPhase("done");
        } catch (e) {
          if (id === ticket.current) {
            setError(message(e));
            setPhase("ready");
          }
        }
      };
      const render = () => {
        if (!running.current || !audio.current || id !== ticket.current) return;
        const time = audio.current.time();
        if (time >= RHYTHM_DURATION) {
          stop();
          setElapsed(RHYTHM_DURATION);
          void finishRef.current([...taps.current]);
          return;
        }
        if (time - last >= 1 / 30) {
          last = time;
          setElapsed(Math.max(0, time));
          if (time - feedbackAt.current > 0.3) setFeedback("");
        }
        frame.current = requestAnimationFrame(render);
      };
      frame.current = requestAnimationFrame(render);
    } catch (e) {
      if (id === ticket.current) {
        stop();
        setError(message(e));
        setPhase("ready");
      }
    }
  }
  const beat = elapsed / RHYTHM_SECONDS,
    phrase = cheeseChart.find((p) => beat >= p.beat && beat < p.beat + 4),
    local = phrase ? beat - phrase.beat : 0;
  const demo = !!phrase?.demo,
    active = phase === "playing";
  const progress = phrase
    ? Math.max(0, Math.min(1, (local - 1) / (phrase.note - 1)))
    : 0;
  const demoCatch = demo && Math.abs(local - (phrase?.note ?? 0)) < 0.2;
  const caught = feedback === "hit" || demoCatch;
  const left = reduced ? 60 : 20 + progress * 40;
  const finalScore =
    phase === "done"
      ? score
      : game?.state.result
        ? {
            hits: game.state.hits ?? 0,
            extras: game.state.extras ?? 0,
            win: game.completed,
          }
        : null;
  return (
    <View style={s.arena}>
      <Text style={ui.eyebrow}>UTAKT · 116 BPM</Text>
      <Text style={ui.h2}>{t("Ost på rømmen")}</Text>
      <Text style={ui.muted}>
        {t(
          "Fang osten under klokka. Lytt til to pip; et ekstra skvikk betyr at du venter et halvt slag til.",
        )}
      </Text>
      <Text style={ui.text}>
        {t(
          "Mål: minst 14 av 17 oster og høyst 5 feiltrykk. To demonstrasjoner viser rytmen først.",
        )}
      </Text>
      <View style={s.scene}>
        <View style={s.clock}>
          <Text style={s.clockText}>◷</Text>
        </View>
        <View testID="rhythm-counter" style={s.counter} />
        <View style={s.target} />
        {(!active || phrase) && (
          <View
            testID="rhythm-cheese"
            style={[
              s.cheese,
              {
                left: `${active ? left : 20}%`,
                opacity: caught ? 0.25 : 1,
              },
            ]}
          >
            <View testID="rhythm-cheese-shadow" style={s.cheeseShadow} />
            <View
              testID={phrase?.sock ? "rhythm-sock-cheese" : "rhythm-cheese-art"}
              style={{ width: "100%", height: "100%" }}
            >
              <CheeseArt sock={!!phrase?.sock} />
            </View>
          </View>
        )}
        <View
          testID="rhythm-bell"
          style={[s.bell, { bottom: caught ? "30%" : "50%" }]}
        >
          <Text style={s.bellHandle}>●</Text>
        </View>
        <Text accessibilityLiveRegion="polite" style={s.cue}>
          {t(
            !active
              ? "Klar for å fange ost?"
              : demo
                ? "Se og lytt"
                : feedback === "hit"
                  ? "På slaget!"
                  : feedback === "miss"
                    ? "Litt utenfor"
                    : !phrase
                      ? "Følg rytmen"
                      : local >= phrase.note - 0.4
                        ? "Din tur"
                        : phrase.sock
                          ? "Sokkeost"
                          : "Ost",
          )}
        </Text>
      </View>
      <View style={s.track}>
        <View
          style={[
            s.fill,
            { width: `${Math.min(100, (elapsed / RHYTHM_DURATION) * 100)}%` },
          ]}
        />
      </View>
      <View style={s.row}>
        <Text style={ui.tag}>
          {t("{0} / 17 fanget", score?.hits ?? finalScore?.hits ?? 0)}
        </Text>
        <Text style={ui.muted}>
          {t("{0} feiltrykk", score?.extras ?? finalScore?.extras ?? 0)}
        </Text>
        <Text style={ui.muted}>
          {t("{0} sekunder igjen", Math.ceil(RHYTHM_DURATION - elapsed))}
        </Text>
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={ui.text}>
          {t(error)}
        </Text>
      )}
      {active ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Fang osten")}
            testID="rhythm-catch"
            onPressIn={() => {
              pressStarted.current = true;
              catchRef.current();
            }}
            onPress={() => {
              if (!pressStarted.current) catchRef.current();
              pressStarted.current = false;
            }}
            style={({ pressed }) => [
              ui.button,
              { minHeight: 72 },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={ui.buttonText}>{t("Fang osten")}</Text>
          </Pressable>
          <Text style={ui.muted}>
            {t(
              "Trykk på knappen eller bruk mellomrom. Trykk under demonstrasjonene teller ikke.",
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              ticket.current++;
              stop();
              setPhase("ready");
              setFeedback("");
            }}
            style={s.quiet}
          >
            <Text style={ui.link}>{t("Avslutt runden")}</Text>
          </Pressable>
        </>
      ) : (
        <>
          {finalScore && (
            <View style={ui.card}>
              <Text style={ui.h3}>
                {t(finalScore.win ? "På slaget!" : "Prøv rytmen en gang til")}
              </Text>
              <Text style={ui.text}>
                {t("{0} / 17 fanget", finalScore.hits)} ·{" "}
                {t("{0} feiltrykk", finalScore.extras)}
              </Text>
            </View>
          )}
          {!game?.completed && (
            <Pressable
              accessibilityRole="button"
              disabled={phase === "loading"}
              onPress={() => void start()}
              style={ui.button}
            >
              <Text style={ui.buttonText}>
                {t(
                  phase === "loading"
                    ? "Laster lyd …"
                    : finalScore
                      ? "Spill igjen"
                      : "Start runden",
                )}
              </Text>
            </Pressable>
          )}
        </>
      )}
      <Text style={ui.muted}>
        {t("Fra Utakt · Akademiet KI-lab. Tilpasset for DinVenn.")}
      </Text>
    </View>
  );
}
const s = themeStyles({
  arena: { gap: 16, padding: 18, borderRadius: 26, backgroundColor: "#eee4f4" },
  scene: {
    width: "100%",
    aspectRatio: 2,
    minHeight: 180,
    borderRadius: 22,
    backgroundColor: "#b83c53",
    overflow: "hidden",
  },
  counter: {
    position: "absolute",
    bottom: 0,
    height: "38%",
    width: "100%",
    backgroundColor: "#4daaa1",
  },
  clock: { position: "absolute", left: "64%", top: 12 },
  clockText: { fontSize: 34, color: "#fff0c5" },
  target: {
    position: "absolute",
    left: "58%",
    bottom: "28%",
    width: "14%",
    height: 10,
    borderRadius: 8,
    backgroundColor: "#27605e",
  },
  bell: {
    position: "absolute",
    left: "55%",
    bottom: "50%",
    width: "25%",
    height: "24%",
    borderTopLeftRadius: 45,
    borderTopRightRadius: 45,
    backgroundColor: "#a8ddd8",
    borderWidth: 2,
    borderColor: "#fff0c5",
  },
  bellHandle: { position: "absolute", top: -17, left: "42%", color: "#fff0c5" },
  cheese: {
    position: "absolute",
    bottom: "30%",
    width: "16%",
    height: "27%",
    alignItems: "center",
  },
  cheeseShadow: {
    position: "absolute",
    bottom: -2,
    left: "12%",
    width: "80%",
    height: 5,
    borderRadius: 10,
    backgroundColor: "#27605e66",
  },
  cue: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: "#27324b",
    color: "#fff0c5",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    fontWeight: "700",
  },
  track: {
    height: 8,
    backgroundColor: palette.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  fill: { height: 8, backgroundColor: palette.coral },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  quiet: { padding: 12, minHeight: 48 },
});
