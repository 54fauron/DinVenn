import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  Text,
  View,
} from "react-native";
import { t, type DealGame } from "@dinvenn/core";
import { palette, ui } from "./ui";
import { themeStyles } from "./theme";
const symbols = ["🍔", "🥑", "🍕", "🍓", "🍩", "🍦", "🥤", "🍟"];
const names = [
  "Burger",
  "Avokado",
  "Pizza",
  "Jordbær",
  "Smultring",
  "Is",
  "Drikke",
  "Pommes frites",
];
export type MemoryState = {
  board: number[];
  matched: number[];
  revealed: number[];
  pending: number;
  mistakes: number;
  result: string;
};
export function newMemory(): MemoryState {
  const board = Array.from({ length: 16 }, (_, i) => i % 8);
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [board[i], board[j]] = [board[j], board[i]];
  }
  return {
    board,
    matched: [],
    revealed: [],
    pending: -1,
    mistakes: 0,
    result: "",
  };
}
export function memoryStep(state: MemoryState, action: number): MemoryState {
  if (
    state.result ||
    action < 0 ||
    action > 15 ||
    state.matched.includes(action) ||
    action === state.pending
  )
    return state;
  if (state.pending < 0)
    return { ...state, pending: action, revealed: [action] };
  const revealed = [state.pending, action];
  const match = state.board[state.pending] === state.board[action];
  const matched = match ? [...state.matched, ...revealed] : state.matched;
  const mistakes = state.mistakes + (match ? 0 : 1);
  return {
    ...state,
    revealed,
    matched,
    mistakes,
    pending: -1,
    result: matched.length === 16 ? "win" : mistakes >= 6 ? "loss" : "",
  };
}
export function memoryPublic(state: MemoryState): DealGame["state"] {
  return {
    ...state,
    board: undefined,
    faces: state.board.map((value, i) =>
      state.matched.includes(i) || state.revealed.includes(i) ? value : null,
    ),
    max_mistakes: 6,
  };
}
export function MemoryBoard({
  state,
  roundKey,
  busy,
  onMove,
  onRestart,
}: {
  state: DealGame["state"];
  roundKey: string;
  busy: boolean;
  onMove: (i: number) => void;
  onRestart: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  const matched = state.matched ?? [],
    revealed = state.revealed ?? [];
  const mismatch =
    revealed.length === 2 && !revealed.every((i) => matched.includes(i));
  useEffect(() => {
    setHidden(false);
    if (!mismatch || state.result) return;
    const timer = setTimeout(() => setHidden(true), 950);
    return () => clearTimeout(timer);
  }, [roundKey, mismatch, state.result]);
  const mistakes = state.mistakes ?? 0,
    limit = state.max_mistakes ?? 6;
  const locked = busy || !!state.result || (mismatch && !hidden);
  return (
    <View style={s.arena}>
      <Text style={ui.eyebrow}>{t("FINN DE LOKALE FAVORITTENE")}</Text>
      <View style={s.row}>
        <Text style={ui.h2}>Memory</Text>
        <Text style={ui.tag}>{t("{0} / 8 par", matched.length / 2)}</Text>
      </View>
      <Text style={ui.muted}>
        {t(
          "Finn åtte par. Du taper ved seks feil. Brettet blandes på nytt for hver nye runde.",
        )}
      </Text>
      <View style={s.row}>
        <Text accessibilityLiveRegion="polite" style={ui.h3}>
          {t("{0} feil igjen", Math.max(0, limit - mistakes))}
        </Text>
        <View style={s.dots}>
          {Array.from({ length: limit }, (_, i) => (
            <View key={i} style={[s.dot, i >= limit - mistakes && s.used]} />
          ))}
        </View>
      </View>
      <View style={s.grid}>
        {Array.from({ length: 16 }, (_, i) => {
          const value =
            hidden && !matched.includes(i) ? null : (state.faces?.[i] ?? null);
          return (
            <MemoryCard
              key={i}
              value={value}
              matched={matched.includes(i)}
              disabled={locked || matched.includes(i) || value !== null}
              label={
                value === null
                  ? t("Snu kort {0}", i + 1)
                  : t("Kort {0}: {1}", i + 1, t(names[value]))
              }
              onPress={() => onMove(i)}
            />
          );
        })}
      </View>
      <Text accessibilityLiveRegion="polite" style={ui.text}>
        {t(
          state.result === "win"
            ? "Alle parene er funnet!"
            : state.result === "loss"
              ? "Seks feil – prøv en ny runde"
              : mismatch && !hidden
                ? "Ikke et par – husk kortene!"
                : revealed.length === 2 && matched.includes(revealed[0])
                  ? "Et par! Fortsett slik."
                  : "Snu to kort og finn et par",
        )}
      </Text>
      {state.result === "loss" && (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          style={ui.button}
          onPress={onRestart}
        >
          <Text style={ui.buttonText}>{t("Prøv igjen")}</Text>
        </Pressable>
      )}
    </View>
  );
}
function MemoryCard({
  value,
  matched,
  disabled,
  label,
  onPress,
}: {
  value: number | null;
  matched: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  const animation = useRef(new Animated.Value(1)).current;
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    animation.stopAnimation();
    if (reduce) {
      animation.setValue(1);
      return;
    }
    animation.setValue(0.2);
    const effect = Animated.spring(animation, {
      toValue: 1,
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    });
    effect.start();
    return () => effect.stop();
  }, [value, reduce, animation]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        matched ? s.matched : value !== null ? s.face : s.back,
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
    >
      <Animated.View
        style={{
          transform: [{ scaleX: animation }],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={value === null ? s.question : s.symbol}>
          {value === null ? "✦" : symbols[value]}
        </Text>
        {matched && <Text style={s.tick}>✓</Text>}
      </Animated.View>
    </Pressable>
  );
}
const s = themeStyles({
  arena: { gap: 16, padding: 18, borderRadius: 26, backgroundColor: "#eee4f4" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  card: {
    width: "23%",
    aspectRatio: 0.85,
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  back: { backgroundColor: palette.peach, borderColor: "#ed8e7b" },
  face: { backgroundColor: "#fffdfb", borderColor: "#eadfd6" },
  matched: { backgroundColor: "#deecdf", borderColor: "#60755d" },
  symbol: { fontSize: 30 },
  question: { fontSize: 28, color: palette.ink },
  tick: { fontSize: 12, color: palette.ink },
  dots: { flexDirection: "row", gap: 5 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.coral,
  },
  used: { backgroundColor: palette.border },
});
export function PracticeMemory() {
  const [state, setState] = useState(newMemory),
    [round, setRound] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    lock.current = false;
  }, [state]);
  function reset() {
    setState(newMemory());
    setRound((v) => v + 1);
  }
  return (
    <View style={{ gap: 14 }}>
      <MemoryBoard
        state={memoryPublic(state)}
        roundKey={`${round}:${state.pending}:${state.mistakes}:${state.matched.length}`}
        busy={false}
        onMove={(i) => {
          if (lock.current) return;
          lock.current = true;
          setState((s) => memoryStep(s, i));
        }}
        onRestart={reset}
      />
      <Pressable accessibilityRole="button" style={ui.button} onPress={reset}>
        <Text style={ui.buttonText}>{t("Ny runde")}</Text>
      </Pressable>
    </View>
  );
}
