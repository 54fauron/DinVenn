import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  Text,
  View,
} from "react-native";
import { t, type DealGame } from "@dinvenn/core";
import { ui, palette } from "./ui";
import { themeStyles } from "./theme";
type State = DealGame["state"];
export type SideKind = "burgers" | "sliding_puzzle";
export const gameNames = {
  tic_tac_toe: "Tre på rad",
  memory: "Memory",
  burgers: "Bygg burgeren",
  sliding_puzzle: "Skyvepuslespill",
  cheese_rhythm: "Ost på rømmen",
};
const ingredientNames = [
  "Burgerbunn",
  "Burger",
  "Ost",
  "Tomat",
  "Salat",
  "Burgertopp",
];
const ingredientColors = [
  "#D99443",
  "#79482E",
  "#F4C853",
  "#D66554",
  "#82A567",
  "#D99443",
];
const solved = [1, 2, 3, 4, 5, 6, 7, 8, 0];
function neighbors(index: number, blank: number) {
  return (
    Math.abs(Math.floor(index / 3) - Math.floor(blank / 3)) +
      Math.abs((index % 3) - (blank % 3)) ===
    1
  );
}
export function newSideGame(kind: SideKind): State {
  if (kind === "burgers") {
    const middle = [1, 2, 3, 4];
    for (let i = 3; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [middle[i], middle[j]] = [middle[j], middle[i]];
    }
    return { target: [0, ...middle, 5], stack: [], mistakes: 0, result: "" };
  }
  const tiles = [...solved];
  let blank = 8,
    previous = -1;
  for (let n = 0; n < 32; n++) {
    const options = tiles
      .map((_, i) => i)
      .filter((i) => neighbors(i, blank) && i !== previous);
    const i = options[Math.floor(Math.random() * options.length)];
    [tiles[i], tiles[blank]] = [tiles[blank], tiles[i]];
    previous = blank;
    blank = i;
  }
  if (tiles.every((n, i) => n === solved[i])) {
    const i = tiles.findIndex((_, i) => neighbors(i, blank));
    [tiles[i], tiles[blank]] = [tiles[blank], tiles[i]];
  }
  return { tiles, moves: 0, result: "" };
}
export function sideStep(kind: SideKind, state: State, action: number): State {
  if (state.result) return state;
  if (kind === "burgers") {
    const stack = state.stack ?? [],
      target = state.target ?? [];
    const right = target[stack.length] === action;
    const next = right ? [...stack, action] : stack;
    const mistakes = (state.mistakes ?? 0) + (right ? 0 : 1);
    return {
      ...state,
      stack: next,
      mistakes,
      result:
        next.length === target.length ? "win" : mistakes >= 3 ? "loss" : "",
    };
  }
  const tiles = [...(state.tiles ?? [])],
    blank = tiles.indexOf(0);
  if (!neighbors(action, blank)) return state;
  [tiles[action], tiles[blank]] = [tiles[blank], tiles[action]];
  return {
    ...state,
    tiles,
    moves: (state.moves ?? 0) + 1,
    result: tiles.every((v, i) => v === solved[i]) ? "win" : "",
  };
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduced(v);
    });
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return reduced;
}
function Layer({
  ingredient,
  animate = false,
}: {
  ingredient: number;
  animate?: boolean;
}) {
  const progress = useRef(new Animated.Value(1)).current,
    reduced = useReducedMotion();
  useEffect(() => {
    if (!animate || reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.spring(progress, {
      toValue: 1,
      tension: 110,
      friction: 7,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [animate, reduced, progress]);
  return (
    <Animated.View
      style={{
        width: "100%",
        alignItems: "center",
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-30, 0],
            }),
          },
        ],
      }}
    >
      <View
        style={[
          s.ingredient,
          {
            backgroundColor: ingredientColors[ingredient],
            height: ingredient === 0 || ingredient === 5 ? 30 : 16,
            borderTopLeftRadius: ingredient === 5 ? 55 : 9,
            borderTopRightRadius: ingredient === 5 ? 55 : 9,
            width: ingredient === 4 ? "96%" : "90%",
          },
        ]}
      >
        {ingredient === 5 && <Text style={s.seeds}>• • • •</Text>}
      </View>
    </Animated.View>
  );
}
export function BurgerBoard({
  state,
  busy,
  onMove,
  onRestart,
}: {
  state: State;
  busy: boolean;
  onMove: (action: number) => void;
  onRestart: () => void;
}) {
  const target = state.target ?? [],
    stack = state.stack ?? [],
    mistakes = state.mistakes ?? 0;
  return (
    <View style={s.arena}>
      <Text style={ui.eyebrow}>{t("PÅ KJØKKENET")}</Text>
      <Text style={ui.h2}>{t("Bygg burgeren")}</Text>
      <Text style={ui.muted}>
        {t("Følg bestillingen fra bunnen og opp. Tre feil avslutter runden.")}
      </Text>
      <View style={s.row}>
        <Text style={ui.tag}>{t("{0} / 6 lag", stack.length)}</Text>
        <Text accessibilityLiveRegion="polite" style={ui.text}>
          {t("{0} feil igjen", 3 - mistakes)}
        </Text>
      </View>
      <View style={s.recipe}>
        {target.map((value, i) => (
          <View key={i} style={[s.chip, i < stack.length && s.done]}>
            <Text style={ui.text}>
              {i < stack.length ? "✓" : `${i + 1}.`} {t(ingredientNames[value])}
            </Text>
          </View>
        ))}
      </View>
      <View style={s.plate}>
        <View style={s.stack}>
          {stack.length ? (
            [...stack]
              .reverse()
              .map((ingredient, i) => (
                <Layer
                  key={stack.length - 1 - i}
                  ingredient={ingredient}
                  animate
                />
              ))
          ) : (
            <Text style={ui.muted}>{t("Tallerkenen er klar")}</Text>
          )}
        </View>
        <View style={s.plateLine} />
      </View>
      <Text accessibilityLiveRegion="polite" style={ui.h3}>
        {t(
          state.result === "win"
            ? "Bestillingen er klar!"
            : state.result === "loss"
              ? "Tre feil – prøv en ny bestilling"
              : "Velg neste ingrediens",
        )}
      </Text>
      <View style={s.choices}>
        {ingredientNames.map((name, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={t("Legg til {0}", t(name))}
            disabled={busy || !!state.result}
            onPress={() => onMove(i)}
            style={({ pressed }) => [
              s.choice,
              pressed && { transform: [{ scale: 0.95 }] },
              (busy || !!state.result) && { opacity: 0.6 },
            ]}
          >
            <View
              style={{ height: 35, justifyContent: "center", width: "100%" }}
            >
              <Layer ingredient={i} />
            </View>
            <Text style={ui.text}>{t(name)}</Text>
          </Pressable>
        ))}
      </View>
      {state.result === "loss" && (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onRestart}
          style={ui.button}
        >
          <Text style={ui.buttonText}>{t("Prøv igjen")}</Text>
        </Pressable>
      )}
    </View>
  );
}
function SlidingTile({
  value,
  index,
  unit,
  disabled,
  onPress,
}: {
  value: number;
  index: number;
  unit: number;
  disabled: boolean;
  onPress: () => void;
}) {
  const xy = useRef(
    new Animated.ValueXY({
      x: (index % 3) * unit,
      y: Math.floor(index / 3) * unit,
    }),
  ).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    const toValue = { x: (index % 3) * unit, y: Math.floor(index / 3) * unit };
    if (reduced) {
      xy.setValue(toValue);
      return;
    }
    const animation = Animated.timing(xy, {
      toValue,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [index, unit, reduced, xy]);
  return (
    <Animated.View
      style={[
        s.slidingPosition,
        {
          width: unit - 8,
          height: unit - 8,
          transform: xy.getTranslateTransform(),
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Flytt brikke {0}", value)}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          s.slidingTile,
          value === index + 1 && s.done,
          pressed && { transform: [{ scale: 0.96 }] },
        ]}
      >
        <Text style={s.tileNumber}>{value}</Text>
        <Text style={s.tileMotif}>
          {["", "☀", "✦", "♡", "✿", "☕", "⌂", "♫", "☾"][value]}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
export function SlidingBoard({
  state,
  busy,
  onMove,
  onRestart,
}: {
  state: State;
  busy: boolean;
  onMove: (action: number) => void;
  onRestart: () => void;
}) {
  const [width, setWidth] = useState(0),
    tiles = state.tiles ?? [],
    blank = tiles.indexOf(0);
  return (
    <View style={s.arena}>
      <Text style={ui.eyebrow}>{t("BIT FOR BIT")}</Text>
      <Text style={ui.h2}>{t("Skyvepuslespill")}</Text>
      <Text style={ui.muted}>
        {t(
          "Trykk på en brikke ved det tomme feltet. Sett tallene i rekkefølge fra 1 til 8, med tomt felt nederst til høyre.",
        )}
      </Text>
      <View style={s.row}>
        <Text style={ui.tag}>{t("{0} trekk", state.moves ?? 0)}</Text>
        <Text style={ui.muted}>{t("Ingen tidsgrense")}</Text>
      </View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          width: "100%",
          aspectRatio: 1,
          backgroundColor: palette.border,
          borderRadius: 20,
        }}
      >
        {(width > 0 ? tiles : [])
          .filter((value) => value !== 0)
          .map((value) => {
            const index = tiles.indexOf(value);
            return (
              <SlidingTile
                key={value}
                value={value}
                index={index}
                unit={width / 3}
                disabled={busy || !!state.result || !neighbors(index, blank)}
                onPress={() => onMove(index)}
              />
            );
          })}
      </View>
      <Text accessibilityLiveRegion="polite" style={ui.h3}>
        {t(
          state.result === "win"
            ? "Alle brikkene er på plass!"
            : "Flytt en brikke til det tomme feltet",
        )}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy || !!state.result}
        onPress={onRestart}
        style={s.quiet}
      >
        <Text style={ui.link}>{t("Bland på nytt")}</Text>
      </Pressable>
    </View>
  );
}
export function PracticeSideGame({ kind }: { kind: SideKind }) {
  const [state, setState] = useState(() => newSideGame(kind)),
    [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    lock = useRef(false);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function reset() {
    if (timer.current) clearTimeout(timer.current);
    lock.current = false;
    setBusy(false);
    setState(newSideGame(kind));
  }
  function move(action: number) {
    if (lock.current) return;
    lock.current = true;
    setState((s) => sideStep(kind, s, action));
    setBusy(true);
    timer.current = setTimeout(() => {
      lock.current = false;
      setBusy(false);
    }, 260);
  }
  const Board = kind === "burgers" ? BurgerBoard : SlidingBoard;
  return (
    <View style={{ gap: 14 }}>
      <Board state={state} busy={busy} onMove={move} onRestart={reset} />
      <Pressable accessibilityRole="button" style={ui.button} onPress={reset}>
        <Text style={ui.buttonText}>{t("Ny runde")}</Text>
      </Pressable>
    </View>
  );
}
const s = themeStyles({
  arena: { gap: 16, padding: 18, borderRadius: 26, backgroundColor: "#fff0c5" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  recipe: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    backgroundColor: "#fffdfb",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  done: { backgroundColor: "#deecdf" },
  plate: {
    paddingTop: 24,
    backgroundColor: "#fffdfb",
    borderRadius: 22,
    minHeight: 190,
    justifyContent: "flex-end",
    alignItems: "center",
    overflow: "hidden",
  },
  stack: { gap: 3, width: "80%", alignItems: "center", padding: 12 },
  plateLine: {
    height: 9,
    borderRadius: 8,
    width: "90%",
    backgroundColor: palette.border,
    marginBottom: 15,
  },
  ingredient: {
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  seeds: { color: "#fff0c5", fontSize: 18, fontWeight: "800" },
  choices: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  choice: {
    width: "48%",
    minHeight: 85,
    borderRadius: 16,
    backgroundColor: "#fffdfb",
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  slidingPosition: { position: "absolute", left: 4, top: 4 },
  slidingTile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  tileNumber: { fontSize: 32, fontWeight: "800", color: palette.ink },
  tileMotif: { fontSize: 16, color: palette.muted },
  quiet: { padding: 12, minHeight: 48 },
});
